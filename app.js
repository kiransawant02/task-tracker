const API_BASE_URL = "https://localhost:7028"; // Update this if your API base URL changes
const modal = new bootstrap.Modal(document.getElementById("taskModal"));
let tasks = [];

// Helper function to escape HTML
function escapeHtml(text) {
  return text ? $("<div>").text(text).html() : "";
}

// Normalize the task object
function normalizeTask(task) {
  return {
    taskId: task.taskId || 0,
    title: task.title || "",
    description: task.description || "",
    assignedUser: task.assignedUser || "",
    status: Number(task.status) || 0,
    dueDate: task.dueDate || "",
    completionDate: task.completedAt || "",
  };
}

// Fetch all tasks
async function fetchTasks() {
  try {
    const filterDue = $("#filterDue").val();
    let url = `${API_BASE_URL}/v1/tasks`;
    if (filterDue) url += `?dueDate=${filterDue}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error fetching tasks: ${res.statusText}`);

    const data = await res.json();
    if (data && data.tasks) tasks = data.tasks;
    renderTasks();
  } catch (err) {
    console.error("Failed to fetch tasks:", err);
  }
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return date.toLocaleDateString("en-GB", options).replace(/ /g, " ");
}

// Render tasks
function renderTasks() {
  const colPending = $("#colPending").empty();
  const colInProgress = $("#colInProgress").empty();
  const colCompleted = $("#colCompleted").empty();
  const now = new Date();

  let countPending = 0,
    countProgress = 0,
    countCompleted = 0;

  const filterDue = $("#filterDue").val();
  const filterStatus = $("#filterStatus").val();

  tasks.forEach((t) => {
    const task = normalizeTask(t);

    // Apply filters
    if (filterDue && task.dueDate) {
      const taskDate = task.dueDate.split("T")[0];
      if (taskDate > filterDue) return;
    } else if (filterDue && !task.dueDate) return;

    if (filterStatus !== "" && task.status !== Number(filterStatus)) return;

    const taskDueDateObj = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue =
      task.status !== 2 && taskDueDateObj && taskDueDateObj < now;

    // Determine badge
    let badgeHtml = "";
    if (task.status === 2 && task.completionDate) {
      badgeHtml = `<span class="badge bg-success ms-1">Completed on ${formatDate(
        task.completionDate
      )}</span>`;
    } else if (isOverdue) {
      badgeHtml = `<span class="badge bg-danger ms-1">Overdue</span>`;
    }

    let cardClass = "";
    if (task.status === 2) cardClass = "bg-success-subtle";
    else if (task.status === 1) cardClass = "bg-info-subtle";
    else cardClass = "bg-light";

    const card = $(`
        <div class="card shadow-sm border-0 ${cardClass}">
          <div class="card-body p-3">
            <h6 class="card-title fw-bold mb-1">
              ${escapeHtml(task.title)} ${badgeHtml}
            </h6>
            <p class="card-text small mb-2">${escapeHtml(
              task.description || ""
            )}</p>
            <small class="text-muted d-block mb-3">
              Assigned: ${escapeHtml(task.assignedUser || "-")} | 
              Due: ${task.dueDate ? formatDate(task.dueDate) : "-"}
            </small>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary edit-task" data-id="${
                task.taskId
              }">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger delete-task" data-id="${
                task.taskId
              }">
                <i class="bi bi-trash"></i>
              </button>
              <div class="dropdown ms-auto">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                  Status
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item change-status" href="#" data-id="${
                    task.taskId
                  }" data-status="0">Pending</a></li>
                  <li><a class="dropdown-item change-status" href="#" data-id="${
                    task.taskId
                  }" data-status="1">In Progress</a></li>
                  <li><a class="dropdown-item change-status" href="#" data-id="${
                    task.taskId
                  }" data-status="2">Completed</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      `);

    if (task.status === 0) {
      colPending.append(card);
      countPending++;
    } else if (task.status === 1) {
      colInProgress.append(card);
      countProgress++;
    } else {
      colCompleted.append(card);
      countCompleted++;
    }
  });

  // Update counters & progress
  $("#countPending").text(countPending);
  $("#countProgress").text(countProgress);
  $("#countCompleted").text(countCompleted);

  const total = countPending + countProgress + countCompleted;
  const completed = countCompleted;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  $("#progressBar")
    .css("width", percent + "%")
    .text(percent + "%");
}

// Add Task
$(document).on("click", "#btnAddTask", function () {
  $("#taskForm")[0].reset();
  $("#taskId").val("");
  modal.show();
});

// Save Task (Add / Update)
$("#taskForm").on("submit", async function (e) {
  e.preventDefault();
  const id = $("#taskId").val();
  const task = {
    title: $("#title").val(),
    description: $("#description").val(),
    assignedUser: $("#assignedUser").val(),
    status: Number($("#status").val()),
    dueDate: $("#dueDate").val() || null,
  };

  try {
    let res;
    if (id) {
      task.TaskId = Number(id);
      res = await fetch(`${API_BASE_URL}/v1/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
    } else {
      res = await fetch(`${API_BASE_URL}/v1/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
    }

    const data = await res.json();
    if (data.result === 1) {
      alert("Task saved successfully.");
      modal.hide();
      await fetchTasks();
    } else {
      alert(data.message || "Error saving task!");
    }
  } catch (err) {
    console.error("Failed to save task:", err);
  }
});

// Edit Task
$(document).on("click", ".edit-task", async function () {
  const id = $(this).data("id");
  try {
    const res = await fetch(`${API_BASE_URL}/v1/tasks/${id}`);
    const data = await res.json();
    const task = data.task;

    if (task) {
      $("#taskId").val(task.taskId);
      $("#title").val(task.title);
      $("#description").val(task.description);
      $("#assignedUser").val(task.assignedUser);
      $("#status").val(task.status);
      $("#dueDate").val(task.dueDate ? task.dueDate.split("T")[0] : "");
      modal.show();
    }
  } catch (err) {
    console.error("Failed to fetch task:", err);
  }
});

// Delete Task
$(document).on("click", ".delete-task", async function () {
  const id = $(this).data("id");
  if (confirm("Delete this task?")) {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/tasks/${id}`, {
        method: "DELETE",
      });

      // Parse JSON response
      const data = await res.json();

      if (res.ok && data.result === 1) {
        alert("Task deleted successfully.");
      } else {
        alert(data.message || "Some error occurred.");
      }

      await fetchTasks(); // Refresh tasks
    } catch (err) {
      console.error("Failed to delete task:", err);
      alert("Some error occurred.");
    }
  }
});

// Change Status
$(document).on("click", ".change-status", async function (e) {
  e.preventDefault();
  const id = $(this).data("id");
  const status = Number($(this).data("status"));
  try {
    await fetch(`${API_BASE_URL}/v1/tasks/${id}/status?status=${status}`, {
      method: "PATCH",
    });
    await fetchTasks();
  } catch (err) {
    console.error("Failed to change status:", err);
  }
});

// Filter by Due Date
$("#filterDue, #filterStatus").on("change", fetchTasks);

// Reset filter
$(document).on("click", "#resetFilter", function () {
  $("#filterDue").val("");
  $("#filterStatus").val("");
  fetchTasks();
});

// Initial load// Initial load
$(document).ready(() => {
  fetchTasks();

  $("#filterDue, #dueDate").on("focus", function () {
    if (this.showPicker) {
      this.showPicker(); // Show the native date picker in supported browsers
    }
  });
});
