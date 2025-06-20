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
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadSubjects(user.uid);
  }
});

// DOM Elements
const subjectForm = document.getElementById("subjectForm");
const subjectInput = document.getElementById("subjectInput");
const subjectList = document.getElementById("subjectList");
const preview = document.getElementById("excelPreview");

// Add new subject
subjectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = subjectInput.value.trim();
  if (name === "") return;

  const userId = auth.currentUser.uid;
  await db.collection("subjects").add({
    name,
    userId,
    attendance: []
  });

  subjectInput.value = "";
  loadSubjects(userId);
});

// Load subjects and display cards


async function loadSubjects(userId) {
  subjectList.innerHTML = "";

  const snapshot = await db.collection("subjects")
    .where("userId", "==", userId)
    .get();

  snapshot.forEach(doc => {
    const data = doc.data();
    const attendance = data.attendance || [];

    const totalP = attendance.filter(d => d.status === "P").length;
    const totalA = attendance.filter(d => d.status === "A").length;
    const total = totalP + totalA;
    const percentage = total === 0 ? 0 : Math.round((totalP / total) * 100);

    const card = document.createElement("div");
    card.className = "subject-card";
card.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <h3 style="margin:0;flex:1;cursor:pointer;" class="subject-name">${data.name}</h3>
    <button class="edit-btn" title="Edit Subject" style="margin-left:8px;">✏️</button>
    <button class="delete-btn" title="Delete Subject" style="margin-left:4px;">🗑️</button>
  </div>
  <p>
    <span style="color:#00c853;font-weight:bold;">Present</span> : ${totalP} &nbsp; 
    <span style="color:#ff1744;font-weight:bold;">Absent</span>  : ${totalA}
  </p>
  <p><strong>📊 ${percentage}% Attendance</strong></p>
`;

    // Redirect to subject.html when clicking the card (except edit/delete)
    card.addEventListener("click", () => {
      localStorage.setItem("subjectId", doc.id);
      localStorage.setItem("subjectName", data.name);
      window.location.href = "subject.html";
    });

    // Prevent card click when clicking edit or delete
    card.querySelector(".edit-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      const newName = prompt("Enter new subject name:", data.name);
      if (newName && newName.trim() && newName !== data.name) {
        await db.collection("subjects").doc(doc.id).update({ name: newName.trim() });
        loadSubjects(userId);
      }
    });

    card.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete "${data.name}"? This cannot be undone.`)) {
        await db.collection("subjects").doc(doc.id).delete();
        loadSubjects(userId);
      }
    });

    subjectList.appendChild(card);
  });
}



// Preview Excel in-browser
document.getElementById("showExcel").addEventListener("click", async () => {
  const userId = auth.currentUser.uid;
  const snapshot = await db.collection("subjects").where("userId", "==", userId).get();

  const subjects = [];
  const dateMap = new Map();

  snapshot.forEach(doc => {
    const data = doc.data();
    subjects.push({ name: data.name, attendance: data.attendance || [] });

    data.attendance?.forEach(entry => {
      if (!dateMap.has(entry.date)) {
        dateMap.set(entry.date, {});
      }
      dateMap.get(entry.date)[data.name] = entry.status;
    });
  });

  const dates = Array.from(dateMap.keys()).sort();
  const table = document.createElement("table");

  const headerRow = document.createElement("tr");
  const dateTh = document.createElement("th");
  dateTh.textContent = "📅 Date";
  headerRow.appendChild(dateTh);

  subjects.forEach(subj => {
    const th = document.createElement("th");
    th.textContent = subj.name;
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  dates.forEach(date => {
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");
    tdDate.textContent = formatDate(date); // <-- CHANGED
    tr.appendChild(tdDate);

    subjects.forEach(subj => {
      const td = document.createElement("td");
      const val = dateMap.get(date)?.[subj.name] || "";
      td.textContent = val;

      if (val === "P") td.classList.add("present");
      if (val === "A") td.classList.add("absent");

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  preview.innerHTML = "<h2>📊 Excel Preview</h2>";
  preview.appendChild(table);
  preview.style.display = "block";
});

// Download Excel file
document.getElementById("downloadExcel").addEventListener("click", async () => {
  const userId = auth.currentUser.uid;
  const snapshot = await db.collection("subjects").where("userId", "==", userId).get();

  const subjects = [];
  const dateMap = new Map();

  snapshot.forEach(doc => {
    const data = doc.data();
    subjects.push({ name: data.name, attendance: data.attendance || [] });

    data.attendance?.forEach(entry => {
      if (!dateMap.has(entry.date)) {
        dateMap.set(entry.date, {});
      }
      dateMap.get(entry.date)[data.name] = entry.status;
    });
  });

  const dates = Array.from(dateMap.keys()).sort();
  const header = ["Date", ...subjects.map(s => s.name)];
  const rows = dates.map(date => {
    const row = [formatDate(date)]; // <-- CHANGED
    subjects.forEach(subj => {
      row.push(dateMap.get(date)?.[subj.name] || "");
    });
    return row;
  });

  const finalData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(finalData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, "Attendance_Report.xlsx");
});