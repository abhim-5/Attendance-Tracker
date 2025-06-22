// subject.js

function formatDate(dateStr) {
    // Accepts YYYY-MM-DD, returns DD-MM-YY
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year.slice(-2)}`;
}
// Ensure Firebase, db, and auth are loaded from firebase-config.js

// Mark attendance for selected date and status
window.markAttendance = async function (status) {
    const selectedDate = document.getElementById("datePicker").value;
    const subjectId = localStorage.getItem("subjectId");
    if (!subjectId || !selectedDate) {
        alert("Missing subject or date info!");
        return;
    }

    try {
        const subjectRef = db.collection("subjects").doc(subjectId);
        const doc = await subjectRef.get();
        if (!doc.exists) {
            alert("Subject not found!");
            return;
        }
        const data = doc.data();
        let attendance = Array.isArray(data.attendance) ? data.attendance : [];

        // Find or create entry for the date
        let entry = attendance.find((a) => a.date === selectedDate);

        if (entry) {
            // Ask if user wants to add multiple
            if (confirm("Do you want to add multiple P/A for this date?")) {
                if (Array.isArray(entry.status)) {
                    entry.status.push(status);
                } else {
                    entry.status = [entry.status, status];
                }
            } else {
                entry.status = [status]; // Overwrite with single
            }
        } else {
            entry = { date: selectedDate, status: [status] };
            attendance.push(entry);
        }

        await subjectRef.update({ attendance });
        fetchAttendance(selectedDate);
    } catch (err) {
        console.error("Error marking attendance:", err);
        alert("Failed to mark attendance. Try again.");
    }
};

// Remove attendance for a specific date
window.removeAttendance = async function (date) {
    const subjectId = localStorage.getItem("subjectId");
    if (!subjectId || !date) return;

    try {
        const subjectRef = db.collection("subjects").doc(subjectId);
        const doc = await subjectRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        let attendance = Array.isArray(data.attendance) ? data.attendance : [];

        attendance = attendance.filter((a) => a.date !== date);

        await subjectRef.update({ attendance });
        fetchAttendance(); // No animation on delete
    } catch (err) {
        console.error("Error removing attendance:", err);
        alert("Failed to remove attendance. Try again.");
    }
};

// Fetch and display attendance stats and log
async function fetchAttendance(animateDate = null) {
    const subjectId = localStorage.getItem("subjectId");
    const statsDiv = document.getElementById("stats");
    const logList = document.getElementById("logList");

    if (!subjectId) return;

    try {
        const doc = await db.collection("subjects").doc(subjectId).get();
        if (!doc.exists) {
            statsDiv.innerHTML = "<p>Subject not found.</p>";
            logList.innerHTML = "";
            return;
        }
        const data = doc.data();
        const attendance = Array.isArray(data.attendance)
            ? data.attendance
            : [];

        const totalP = attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "P").length : (a.status === "P" ? 1 : 0)), 0);
        const totalA = attendance.reduce((sum, a) => sum + (Array.isArray(a.status) ? a.status.filter(s => s === "A").length : (a.status === "A" ? 1 : 0)), 0);

        logList.innerHTML = "";

        attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

        attendance.forEach((entry) => {
            const logItem = document.createElement("div");
            logItem.className = "log-entry";

            // Animate only the log that matches animateDate
            if (animateDate && entry.date === animateDate) {
                logItem.classList.add("animated-in");
            }

            // Render all statuses for the date
            let statusHtml = "";
            (Array.isArray(entry.status) ? entry.status : [entry.status]).forEach(s => {
                statusHtml += `<span class="tag ${s === "P" ? "present-tag" : "absent-tag"}">${s}</span> `;
            });

            logItem.innerHTML = `
              <span>
                <i class="ri-calendar-check-line"></i>
                ${formatDate(entry.date)}
              </span>
              <span>${statusHtml.trim()}</span>
              <button class="remove-btn" title="Remove attendance" onclick="removeAttendance('${entry.date}')">&#10006;</button>
            `;
            logList.appendChild(logItem);
        });

        const percentage =
            totalP + totalA > 0
                ? ((totalP / (totalP + totalA)) * 100).toFixed(1)
                : "N/A";

        // Get or set benchmark from localStorage, default 75
        let benchmark = parseFloat(localStorage.getItem("attendanceBenchmark")) || 75;
        let extraA = parseInt(localStorage.getItem("attendanceExtraA")) || 0;
        let extraP = 0;

        // Helper functions
        function calcExtraP(totalP, totalA, extraA, percent) {
            // (totalP + x) / (totalP + totalA + extraA + x) >= percent/100
            // x >= (percent*(totalA+extraA) - (1-percent)*totalP) / (1-percent)
            const b = percent / 100;
            const denom = 1 - b;
            if (denom <= 0) return 0;
            const x = Math.max(0, Math.ceil((b * (totalA + extraA) - (1 - b) * totalP) / denom));
            return x;
        }
        function calcExtraA(totalP, totalA, extraP, percent) {
            // (totalP + extraP) / (totalP + totalA + x + extraP) >= percent/100
            // x <= ((totalP + extraP)/percent - (totalP + totalA + extraP))
            const b = percent / 100;
            if (b <= 0) return 0;
            const x = Math.max(0, Math.floor((totalP + extraP) / b - (totalP + totalA + extraP)));
            return x;
        }

        // Initial calculation
        extraP = calcExtraP(totalP, totalA, extraA, benchmark);

        // Stats box HTML
        statsDiv.innerHTML = `
          <h3><i class="ri-bar-chart-2-fill"></i> Attendance Stats</h3>
          <p><strong>Current Presents :</strong> ${totalP}</p>
          <p><strong>Current Absents :</strong> ${totalA}</p>
          <p><strong>Current Attendance :</strong> ${percentage}%</p>
          <label><strong>Benchmark (%) :</strong>
            <input id="benchmarkInput" type="number" min="1" max="100" value="${benchmark}" style="width:60px; margin-left:8px; margin-bottom:2px;">
          </label>
          
          <label><strong>Extra A's :</strong>
            <input id="extraAInput" type="number" min="0" value="${extraA}" style="width:60px; margin-left:8px; margin-bottom:2px;">
          </label>
          
          <label><strong>Extra P's :</strong>
            <input id="extraPInput" type="number" min="0" value="${extraP}" style="width:60px; margin-left:8px; margin-bottom:3px;">
          </label>
        `;

        // Sync logic
        const benchmarkInput = document.getElementById("benchmarkInput");
        const extraAInput = document.getElementById("extraAInput");
        const extraPInput = document.getElementById("extraPInput");

        function updateFields(source) {
            let b = parseFloat(benchmarkInput.value) || 75;
            let a = parseInt(extraAInput.value) || 0;
            let p = parseInt(extraPInput.value) || 0;

            if (b < 1) b = 1;
            if (b > 100) b = 100;

            if (source === "benchmark" || source === "A") {
                // Update extraP based on extraA and benchmark
                p = calcExtraP(totalP, totalA, a, b);
                extraPInput.value = p;
            } else if (source === "P") {
                // Update extraA based on extraP and benchmark
                a = calcExtraA(totalP, totalA, p, b);
                extraAInput.value = a;
            }

            localStorage.setItem("attendanceBenchmark", b);
            localStorage.setItem("attendanceExtraA", extraAInput.value);
        }

        benchmarkInput.addEventListener("input", () => updateFields("benchmark"));
        extraAInput.addEventListener("input", () => updateFields("A"));
        extraPInput.addEventListener("input", () => updateFields("P"));
    } catch (err) {
        console.error("Error fetching attendance:", err);
        statsDiv.innerHTML = "<p>Error loading attendance data.</p>";
        logList.innerHTML = "";
    }
}

// On page load: check subject info, set title, and fetch attendance
document.addEventListener("DOMContentLoaded", () => {
    const subjectId = localStorage.getItem("subjectId");
    const subjectName = localStorage.getItem("subjectName");

    if (!subjectId || !subjectName) {
        alert("Subject info missing. Redirecting to dashboard...");
        window.location.href = "dashboard.html";
        return;
    }

    document.getElementById("subjectTitle").textContent = subjectName;

    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "index.html";
        } else {
            fetchAttendance(false);
        }
    });
});

const dateInput = document.getElementById("datePicker");
const today = new Date();
const dd = String(today.getDate()).padStart(2, "0");
const mm = String(today.getMonth() + 1).padStart(2, "0"); // January is 0!
const yyyy = today.getFullYear();
dateInput.value = `${yyyy}-${mm}-${dd}`;
