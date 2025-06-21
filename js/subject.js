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

        // Update or add attendance for the date
        const existing = attendance.find((a) => a.date === selectedDate);
        if (existing) {
            existing.status = status;
        } else {
            attendance.push({ date: selectedDate, status });
        }

        await subjectRef.update({ attendance });
        fetchAttendance(selectedDate); // Pass the date you just marked
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

        let totalP = 0,
            totalA = 0;
        logList.innerHTML = "";

        attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

        attendance.forEach((entry) => {
            const logItem = document.createElement("div");
            logItem.className = `log-entry ${entry.status === "P" ? "present" : "absent"}`;

            // Animate only the log that matches animateDate
            if (animateDate && entry.date === animateDate) {
                logItem.classList.add("animated-in");
            }

            logItem.innerHTML = `
          <span>
            <i class="${entry.status === "P" ? "ri-checkbox-circle-line" : "ri-close-circle-line"}"></i>
            ${formatDate(entry.date)}
          </span>
          <span class="tag ${entry.status === "P" ? "present-tag" : "absent-tag"}">${entry.status}</span>
          <button class="remove-btn" title="Remove attendance" onclick="removeAttendance('${entry.date}')">&#10006;</button>
        `;
            logList.appendChild(logItem);
        });

        const percentage =
            totalP + totalA > 0
                ? ((totalP / (totalP + totalA)) * 100).toFixed(1)
                : "N/A";

        statsDiv.innerHTML = `
      <h3><i class="ri-bar-chart-2-fill"></i> Attendance Stats</h3>
      <p><strong>Total Present:</strong> ${totalP}</p>
      <p><strong>Total Absent:</strong> ${totalA}</p>
      <p><strong>Percentage:</strong> ${percentage}%</p>
    `;
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
