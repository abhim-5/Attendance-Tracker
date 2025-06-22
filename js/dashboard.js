window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});

// Firebase Auth and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Date formatting function: YYYY-MM-DD -> DD-MM-YY
function formatDate(dateStr) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year.slice(-2)}`;
}

// Redirect if not logged in
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        loadSubjects(user.uid); // Remove .then(() => renderExcelPreview());
    }
});

// DOM Elements
const subjectForm = document.getElementById("subjectForm");
const subjectInput = document.getElementById("subjectInput");
const subjectList = document.getElementById("subjectList");
const preview = document.getElementById("excelPreview");
let excelPreviewEnabled = false;

// Show Excel Preview button
document.getElementById("showExcel").addEventListener("click", async () => {
    excelPreviewEnabled = true;
    await renderExcelPreview();
});

// Add new subject
subjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = subjectInput.value.trim();
    if (name === "") return;

    const userId = auth.currentUser.uid;
    await db.collection("subjects").add({
        name,
        userId,
        attendance: [],
    });

    subjectInput.value = "";
    await loadSubjects(userId);
    if (excelPreviewEnabled) await renderExcelPreview();
});

// Load subjects and display cards
async function loadSubjects(userId) {
    subjectList.innerHTML = "";

    const snapshot = await db
        .collection("subjects")
        .where("userId", "==", userId)
        .get();

    snapshot.forEach((doc) => {
        const data = doc.data();
        const attendance = data.attendance || [];

        const totalP = attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "P").length : (a.status === "P" ? 1 : 0)), 0);
        const totalA = attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "A").length : (a.status === "A" ? 1 : 0)), 0);
        const total = totalP + totalA;
        const percentage = total === 0 ? 0 : Math.round((totalP / total) * 100);

        const card = document.createElement("div");
        card.className = "subject-card";
        card.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <h3 style="margin:0;flex:1;cursor:pointer;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" class="subject-name">${data.name}</h3>
    <button class="edit-btn" title="Edit Subject" style="margin-left:8px;">✏️</button>
    <button class="delete-btn" title="Delete Subject" style="margin-left:4px;">🗑️</button>
  </div>
  <p>
    <span style="color:#00c853;font-weight:bold;">Present</span> : ${totalP} &nbsp; 
    <span style="color:#ff1744;font-weight:bold;">Absent</span>  : ${totalA}
  </p>
  <p><strong>📊 ${percentage}% Attendance</strong></p>
`;

        // Redirect to subject.html when clicking the card (except edit/delete)
        card.addEventListener("click", () => {
            localStorage.setItem("subjectId", doc.id);
            localStorage.setItem("subjectName", data.name);
            window.location.href = "subject.html";
        });

        // Prevent card click when clicking edit
        card.querySelector(".edit-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            const newName = prompt("Enter new subject name:", data.name);
            if (newName && newName.trim() && newName !== data.name) {
                await db
                    .collection("subjects")
                    .doc(doc.id)
                    .update({ name: newName.trim() });
                await loadSubjects(userId);
                if (excelPreviewEnabled) await renderExcelPreview();
            }
        });

        // Prevent card click when clicking delete
        card.querySelector(".delete-btn").addEventListener(
            "click",
            async (e) => {
                e.stopPropagation();
                if (
                    confirm(
                        `Are you sure you want to delete "${data.name}"? This cannot be undone.`
                    )
                ) {
                    await db.collection("subjects").doc(doc.id).delete();
                    await loadSubjects(userId);
                    if (excelPreviewEnabled) await renderExcelPreview();
                }
            }
        );

        subjectList.appendChild(card);
    });
}

// Render Excel Preview
async function renderExcelPreview() {
    const userId = auth.currentUser.uid;

    const snapshot = await db
        .collection("subjects")
        .where("userId", "==", userId)
        .get();

    const subjects = [];
    const dateMap = new Map();

    snapshot.forEach((doc) => {
        const data = doc.data();
        subjects.push({ name: data.name, attendance: data.attendance || [] });

        data.attendance?.forEach((entry) => {
            if (!dateMap.has(entry.date)) {
                dateMap.set(entry.date, {});
            }
            dateMap.get(entry.date)[data.name] = entry.status;
        });
    });

    const dates = Array.from(dateMap.keys()).sort();
    const table = document.createElement("table");
    table.style.fontSize = "0.9rem"; 

    // --- Summary rows ---
    const summaryRows = [
        {
            label: "Attendance",
            getValue: (subj) => {
                const p = subj.attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "P").length : (a.status === "P" ? 1 : 0)), 0);
                const a = subj.attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "A").length : (a.status === "A" ? 1 : 0)), 0);
                const total = p + a;
                return total === 0 ? "N/A" : Math.round((p / total) * 100) + "%";
            },
        }
    ];

    summaryRows.forEach((rowInfo, rowIdx) => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.textContent = rowInfo.label;
        tr.appendChild(th);
        subjects.forEach((subj) => {
            const td = document.createElement("td");
            td.textContent = rowInfo.getValue(subj);
            td.style.fontWeight = "bold";
            tr.appendChild(td);
        });
        if (rowIdx === 0) {
            // Apply #848409 color to all cells in the first summary row
             Array.from(tr.children).forEach(cell => {
                cell.style.background = "#848409";
                cell.style.color = "#111"; 
             });
          
        }
        table.appendChild(tr);
    });

    // --- Header row ---
    const headerRow = document.createElement("tr");
    const dateTh = document.createElement("th");
    dateTh.textContent = "Subjects"; // 
    headerRow.appendChild(dateTh);




    subjects.forEach((subj) => {
        const th = document.createElement("th");
        th.textContent = subj.name;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // For the header row (Subjects)
    Array.from(headerRow.children).forEach(cell => {
        cell.style.background = "#848409";
        cell.style.color = "#000 !important";
    });

    dates.forEach((date) => {
        const tr = document.createElement("tr");
        const tdDate = document.createElement("td");
        tdDate.textContent = formatDate(date);
        tr.appendChild(tdDate);

        subjects.forEach((subj) => {
            const td = document.createElement("td");
            const valArr = dateMap.get(date)?.[subj.name];
            if (Array.isArray(valArr)) {
                td.innerHTML = valArr.map(v =>
                    `<span class="${v === "P" ? "present" : v === "A" ? "absent" : ""}">${v}</span>`
                ).join(" ");
            } else {
                td.innerHTML = valArr ? `<span class="${valArr === "P" ? "present" : valArr === "A" ? "absent" : ""}">${valArr}</span>` : "";
            }
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    // Set column widths for Excel preview table (smaller but enough for text)
const colCount = subjects.length + 1; // +1 for the date/subject column
const colgroup = document.createElement("colgroup");
for (let i = 0; i < colCount; i++) {
    const col = document.createElement("col");
    // First column (Subjects/Dates) a bit wider, others smaller but enough for text
    col.style.width = i === 0 ? "80px" : "80px";
    colgroup.appendChild(col);
}
table.prepend(colgroup);

    preview.style.display = "block";
    const container = preview.parentElement;
    let heading = container.querySelector("#excelPreviewHeading");
    if (!heading) {
        heading = document.createElement("h2");
        heading.id = "excelPreviewHeading";
        heading.textContent = "📊 Excel Preview";
        container.insertBefore(heading, preview);
    }

    preview.innerHTML = "";
    preview.appendChild(table);

    // Sticky bottom summary rows for long tables
    const dataRowCount = dates.length;
    if (dataRowCount > 15) {
        const rows = table.querySelectorAll("tr");
        if (rows.length >= 2) {
            const firstRowClone = rows[0].cloneNode(true);
            const secondRowClone = rows[1].cloneNode(true);

            // Set ALL cells in both rows to #848409 and white text
            Array.from(firstRowClone.children).forEach(cell => {
                cell.style.background = "#848409";
                cell.style.color = "#111";
            });
            Array.from(secondRowClone.children).forEach(cell => {
                cell.style.background = "#848409";
                cell.style.color = "#fff";
            });

            firstRowClone.classList.add("sticky-bottom-row");
            secondRowClone.classList.add("sticky-bottom-row");
            table.appendChild(firstRowClone);
            table.appendChild(secondRowClone);
        }
    }
}

// Download Excel file
document.getElementById("downloadExcel").addEventListener("click", async () => {
    const userId = auth.currentUser.uid;

    const snapshot = await db
        .collection("subjects")
        .where("userId", "==", userId)
        .get();

    const subjects = [];
    const dateMap = new Map();

    snapshot.forEach((doc) => {
        const data = doc.data();
        subjects.push({ name: data.name, attendance: data.attendance || [] });

        data.attendance?.forEach((entry) => {
            if (!dateMap.has(entry.date)) {
                dateMap.set(entry.date, {});
            }
            dateMap.get(entry.date)[data.name] = entry.status;
        });
    });

    const dates = Array.from(dateMap.keys()).sort();

const summaryRows = [
    ["Attendance %", ...subjects.map(subj => {
        const p = subj.attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "P").length : (a.status === "P" ? 1 : 0)), 0);
        const a = subj.attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "A").length : (a.status === "A" ? 1 : 0)), 0);
        const total = p + a;
        return total === 0 ? "N/A" : Math.round((p / total) * 100) + "%";
    })],
    ["Total P", ...subjects.map(subj => subj.attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "P").length : (a.status === "P" ? 1 : 0)), 0))],
    ["Total A", ...subjects.map(subj => subj.attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "A").length : (a.status === "A" ? 1 : 0)), 0))]
];

    const header = ["Subjects", ...subjects.map((s) => s.name)];
    const rows = dates.map((date) => {
        const row = [formatDate(date)];
        subjects.forEach((subj) => {
            // row.push(dateMap.get(date)?.[subj.name] || "");
            const valArr = dateMap.get(date)?.[subj.name];
            row.push(Array.isArray(valArr) ? valArr.join(" ") : (valArr || ""));
        });
        return row;
    });

    // Place summary rows at the very top, then header, then data
    const finalData = [...summaryRows, header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    ws["!cols"] = [{ wch: 14 }, ...subjects.map(() => ({ wch: 12 }))];

    const totalRows = finalData.length;
    const totalCols = header.length;

    // Make every cell center aligned in the sheet
for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell) {
            if (!cell.s) cell.s = {};
            cell.s.alignment = { horizontal: "center", vertical: "center" };
        }
    }
}

 // Make header row bold (already center aligned)
header.forEach((col, idx) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: idx })];
    if (cell) {
        cell.s = cell.s || {};
        cell.s.font = { bold: true };
        cell.s.alignment = { horizontal: "center", vertical: "center" };
    }
});

// Make first column (Date) bold (already center aligned)
for (let r = 1; r < finalData.length; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cell) {
        cell.s = cell.s || {};
        cell.s.font = { bold: true };
        cell.s.alignment = { horizontal: "center", vertical: "center" };
    }
}

// Make "P" and "A" cells bold (keep center alignment)
for (let r = 1; r < finalData.length; r++) {
    for (let c = 1; c <= subjects.length; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && (cell.v === "P" || cell.v === "A")) {
            cell.s = cell.s || {};
            cell.s.font = { bold: true };
            cell.s.alignment = { horizontal: "center", vertical: "center" };
        }
    }
}

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "Attendance_Report.xlsx");
});
