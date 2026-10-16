const form = document.getElementById("attendanceForm");
const records = document.getElementById("records");
const message = document.getElementById("message");
const dateInput = document.getElementById("attendanceDate");

dateInput.value = new Date().toISOString().slice(0, 10);

async function loadRecords() {
  records.replaceChildren();
  try {
    const response = await fetch("/api/attendance");
    if (!response.ok) throw new Error("Could not load records");
    const data = await response.json();

    data.forEach(item => {
      const row = document.createElement("tr");
      [item.studentName, item.rollNumber, item.attendanceDate, item.status].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value ?? "";
        row.appendChild(cell);
      });

      const actionCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.className = "delete";
      deleteButton.addEventListener("click", async () => {
        if (!confirm("Delete this attendance record?")) return;
        const result = await fetch(`/api/attendance/${item.id}`, { method: "DELETE" });
        if (result.ok) loadRecords();
        else message.textContent = "Could not delete record.";
      });
      actionCell.appendChild(deleteButton);
      row.appendChild(actionCell);
      records.appendChild(row);
    });
  } catch (error) {
    message.textContent = "Cannot connect to backend. Check that Spring Boot is running.";
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "Saving...";
  const payload = {
    studentName: document.getElementById("studentName").value.trim(),
    rollNumber: document.getElementById("rollNumber").value.trim(),
    attendanceDate: dateInput.value,
    status: document.getElementById("status").value
  };

  try {
    const response = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Save failed");
    form.reset();
    dateInput.value = new Date().toISOString().slice(0, 10);
    message.textContent = "Attendance saved successfully!";
    await loadRecords();
  } catch (error) {
    message.textContent = "Could not save attendance. Check the backend terminal.";
  }
});

document.getElementById("refreshButton").addEventListener("click", loadRecords);
loadRecords();
