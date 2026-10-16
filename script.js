/* ========================================
   DailyTasks - SCRIPT.JS
   ======================================== */

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskDate = document.getElementById("taskDate");
const taskTime = document.getElementById("taskTime");
const taskPriority = document.getElementById("taskPriority");
const taskCategory = document.getElementById("taskCategory");
const taskReminder = document.getElementById("taskReminder");
const taskModal = document.getElementById("taskModal");
const toastMessage = document.getElementById("toastMessage");

const themeColors = {
    lavender: "#8B78D8",
    sage: "#648B72",
    rose: "#D87591",
    ocean: "#428DC2",
    sunshine: "#C58B31"
};

const pageHeadings = {
    dashboard: "DailyTasks ✨",
    tasks: "All tasks",
    calendar: "Calendar",
    reminders: "Reminders",
    settings: "Settings & themes"
};

let tasks = loadTasks();
let currentPage = "dashboard";
let currentFilter = "all";
let currentCategory = "all";
let editingTaskId = null;
let calendarDate = new Date();
let selectedCalendarDate = getToday();
let toastTimer;
const notifiedReminders = new Set();

function loadTasks() {
    const savedTasks = getSetting("plannerTasks");

    if (!savedTasks) {
        return [];
    }

    try {
        const parsedTasks = JSON.parse(savedTasks);
        if (!Array.isArray(parsedTasks)) {
            console.error("Saved planner tasks are not a list; existing data was left unchanged.");
            return [];
        }

        return parsedTasks
            .filter(task => task && typeof task === "object" && typeof task.title === "string")
            .map(task => ({
                ...task,
                id: String(task.id || createTaskId()),
                title: task.title,
                date: typeof task.date === "string" ? task.date : "",
                time: typeof task.time === "string" ? task.time : "",
                priority: task.priority || "Medium",
                category: task.category || "Personal",
                completed: Boolean(task.completed),
                description: typeof task.description === "string" ? task.description : "",
                reminder: Boolean(task.reminder)
            }));
    } catch (error) {
        console.error("Unable to parse saved planner tasks; existing data was left unchanged.", error);
        return [];
    }
}

function saveTasks() {
    if (setSetting("plannerTasks", JSON.stringify(tasks))) {
        return true;
    }
    showToast("Your changes could not be saved in this browser.");
    return false;
}

function getSetting(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error(`Unable to read ${key} from local storage.`, error);
        return null;
    }
}

function setSetting(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error(`Unable to save ${key} to local storage.`, error);
        return false;
    }
}

function getToday() {
    const today = new Date();
    return toDateString(today);
}

function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(dateString, options = { day: "numeric", month: "short", year: "numeric" }) {
    if (!dateString) {
        return "No date";
    }
    return parseDate(dateString).toLocaleDateString("en-IN", options);
}

function createTaskId() {
    return Date.now().toString() + Math.random().toString(16).slice(2);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function showToast(message) {
    if (!toastMessage) {
        return;
    }
    toastMessage.textContent = message;
    toastMessage.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastMessage.classList.remove("show"), 2800);
}

function openTaskModal(task = null) {
    if (!taskForm || !taskModal) {
        return;
    }
    taskForm.reset();
    taskTitle.setCustomValidity("");
    editingTaskId = task ? task.id : null;

    if (task) {
        document.getElementById("modalTitle").textContent = "Edit task";
        document.getElementById("saveTaskBtn").textContent = "Save changes";
        taskTitle.value = task.title;
        taskDescription.value = task.description || "";
        taskDate.value = task.date || "";
        taskTime.value = task.time || "";
        taskPriority.value = task.priority || "Medium";
        taskCategory.value = task.category || "Personal";
        taskReminder.checked = Boolean(task.reminder);
    } else {
        document.getElementById("modalTitle").textContent = "Create a task";
        document.getElementById("saveTaskBtn").textContent = "Save task";
        taskDate.value = getToday();
    }

    taskModal.classList.add("open");
    taskModal.setAttribute("aria-hidden", "false");
    taskTitle.focus();
}

function closeTaskModal() {
    if (!taskModal || !taskForm) {
        return;
    }
    taskModal.classList.remove("open");
    taskModal.setAttribute("aria-hidden", "true");
    taskForm.reset();
    taskTitle.setCustomValidity("");
    editingTaskId = null;
    document.getElementById("modalTitle").textContent = "Create a task";
    document.getElementById("saveTaskBtn").textContent = "Save task";
}

function addTask(event) {
    event.preventDefault();

    const title = taskTitle.value.trim();
    if (!title) {
        showToast("Please enter a task title.");
        taskTitle.focus();
        return;
    }
    if (!taskDate.value) {
        showToast("Please choose a due date.");
        taskDate.focus();
        return;
    }

    const taskValues = {
        title,
        description: taskDescription.value.trim(),
        date: taskDate.value,
        time: taskTime.value,
        priority: taskPriority.value,
        category: taskCategory.value,
        reminder: taskReminder.checked
    };

    const previousTasks = tasks;
    if (editingTaskId) {
        tasks = tasks.map(task => task.id === editingTaskId
            ? { ...task, ...taskValues }
            : task);
    } else {
        tasks.push({
            id: createTaskId(),
            ...taskValues,
            completed: false,
            createdAt: new Date().toISOString()
        });
    }

    const wasEditing = Boolean(editingTaskId);
    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }
    closeTaskModal();
    renderAll();
    showToast(wasEditing ? "Task updated." : "Task created.");
}

function makeTaskMarkup(task) {
    const isOverdue = task.date && task.date < getToday() && !task.completed;
    const priority = String(task.priority || "Medium").toLowerCase();
    return `
        <article class="task-item ${task.completed ? "completed is-completed" : ""}">
            <div class="task-main">
                <input
                    type="checkbox"
                    class="task-checkbox task-check"
                    data-action="toggle"
                    data-id="${escapeHTML(task.id)}"
                    ${task.completed ? "checked" : ""}
                    aria-label="Mark ${escapeHTML(task.title)} as ${task.completed ? "pending" : "completed"}"
                >
                <div class="task-details">
                    <h3 class="task-title">${escapeHTML(task.title)}</h3>
                    ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
                    <div class="task-meta">
                        <span>${escapeHTML(task.category || "Personal")}</span>
                        <span class="priority-badge ${escapeHTML(priority)}">${escapeHTML(task.priority || "Medium")} priority</span>
                        <span>${escapeHTML(formatDate(task.date))}</span>
                        ${task.time ? `<span>${escapeHTML(task.time)}</span>` : ""}
                        ${task.reminder ? "<span>Reminder set</span>" : ""}
                        ${isOverdue ? '<span class="overdue">Overdue</span>' : ""}
                    </div>
                </div>
            </div>
            <div class="task-actions">
                <button type="button" class="small-action" data-action="edit" data-id="${escapeHTML(task.id)}" aria-label="Edit ${escapeHTML(task.title)}">Edit</button>
                <button type="button" class="small-action" data-action="delete" data-id="${escapeHTML(task.id)}" aria-label="Delete ${escapeHTML(task.title)}">Delete</button>
            </div>
        </article>
    `;
}

function renderTaskList(element, taskItems, emptyMessage = "No tasks here yet.") {
    if (!element) {
        return;
    }
    element.innerHTML = taskItems.length
        ? taskItems.map(makeTaskMarkup).join("")
        : `<div class="empty-state"><h3>${escapeHTML(emptyMessage)}</h3><p>Add a task or try changing your search or filter.</p></div>`;
}

function getFilteredTasks() {
    let filteredTasks = [...tasks];

    if (currentFilter === "pending") {
        filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (currentFilter === "completed") {
        filteredTasks = filteredTasks.filter(task => task.completed);
    } else if (currentFilter === "today") {
        filteredTasks = filteredTasks.filter(task => task.date === getToday());
    } else if (currentFilter === "upcoming") {
        filteredTasks = filteredTasks.filter(task => task.date > getToday() && !task.completed);
    }

    const searchText = document.getElementById("searchInput").value.toLowerCase().trim();
    if (searchText) {
        filteredTasks = filteredTasks.filter(task =>
            task.title.toLowerCase().includes(searchText) ||
            task.category.toLowerCase().includes(searchText) ||
            task.description.toLowerCase().includes(searchText)
        );
    }

    const priority = document.getElementById("priorityFilter").value;
    const category = document.getElementById("categoryFilter").value;
    if (priority !== "all") {
        filteredTasks = filteredTasks.filter(task => task.priority === priority);
    }
    if (category !== "all") {
        filteredTasks = filteredTasks.filter(task => task.category === category);
    }
    if (currentCategory !== "all") {
        filteredTasks = filteredTasks.filter(task => task.category === currentCategory);
    }

    return filteredTasks.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date) || String(a.time || "").localeCompare(String(b.time || ""));
    });
}

function renderTasks() {
    renderTaskList(document.getElementById("allTaskList"), getFilteredTasks(), "No tasks found.");
}

function toggleTask(id) {
    const previousTasks = tasks;
    tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
    if (saveTasks()) {
        renderAll();
    } else {
        tasks = previousTasks;
    }
}

function deleteTask(id) {
    const confirmed = window.confirm("Are you sure you want to delete this task?");
    if (!confirmed) {
        return;
    }
    const previousTasks = tasks;
    tasks = tasks.filter(task => task.id !== id);
    if (saveTasks()) {
        renderAll();
        showToast("Task deleted.");
    } else {
        tasks = previousTasks;
    }
}

function editTask(id) {
    const task = tasks.find(item => item.id === id);
    if (task) {
        openTaskModal(task);
    }
}

function renderDashboard() {
    const todayTasks = tasks.filter(task => task.date === getToday());
    const completedToday = todayTasks.filter(task => task.completed).length;
    const upcomingTasks = tasks
        .filter(task => task.date > getToday() && !task.completed)
        .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || "").localeCompare(String(b.time || "")));

    document.getElementById("todayCount").textContent = todayTasks.length;
    document.getElementById("completedCount").textContent = completedToday;
    document.getElementById("upcomingCount").textContent = upcomingTasks.length;

    const progress = todayTasks.length ? Math.round(completedToday / todayTasks.length * 100) : 0;
    document.getElementById("progressPercent").textContent = `${progress}%`;
    document.getElementById("progressFill").style.width = `${progress}%`;

    renderTaskList(
        document.getElementById("todayTaskList"),
        todayTasks,
        "No tasks scheduled for today."
    );

    const upcomingList = document.getElementById("upcomingList");
    upcomingList.innerHTML = upcomingTasks.length
        ? upcomingTasks.slice(0, 5).map(task => {
            const date = parseDate(task.date);
            return `
                <div class="upcoming-item">
                    <div class="date-tile"><strong>${date.getDate()}</strong><span>${escapeHTML(date.toLocaleDateString("en-IN", { month: "short" }))}</span></div>
                    <div class="upcoming-info"><strong>${escapeHTML(task.title)}</strong><p>${escapeHTML(task.time || task.category)}</p></div>
                </div>
            `;
        }).join("")
        : '<div class="empty-state">No upcoming tasks.</div>';
}

function renderCalendar() {
    const calendarGrid = document.getElementById("calendarGrid");
    if (!calendarGrid) {
        return;
    }

    const view = document.getElementById("calendarView").value;
    let days = [];
    if (view === "week") {
        const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate());
        start.setDate(start.getDate() - start.getDay());
        days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return { date, outsideMonth: date.getMonth() !== calendarDate.getMonth() };
        });
        const end = days[6].date;
        document.getElementById("calendarTitle").textContent =
            `${formatDate(toDateString(days[0].date), { day: "numeric", month: "short" })} – ${formatDate(toDateString(end), { day: "numeric", month: "short", year: "numeric" })}`;
    } else {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const numberOfDays = new Date(year, month + 1, 0).getDate();
        document.getElementById("calendarTitle").textContent =
            calendarDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let day = 1; day <= numberOfDays; day++) {
            days.push({ date: new Date(year, month, day), outsideMonth: false });
        }
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const cells = dayNames.map(day => `<div class="calendar-weekday">${day}</div>`);
    days.forEach(day => {
        if (!day) {
            cells.push('<div class="calendar-day empty"></div>');
            return;
        }
        const dateString = toDateString(day.date);
        const dateTasks = tasks.filter(task => task.date === dateString);
        const categories = [...new Set(dateTasks.map(task => task.category || "Other"))].slice(0, 4);
        const classes = [
            "calendar-day",
            dateString === getToday() ? "today" : "",
            dateString === selectedCalendarDate ? "selected" : "",
            day.outsideMonth ? "outside-month" : ""
        ].filter(Boolean).join(" ");
        cells.push(`
            <button type="button" class="${classes}" data-calendar-date="${dateString}" aria-label="${escapeHTML(formatDate(dateString))}, ${dateTasks.length} tasks">
                <span class="day-number">${day.date.getDate()}</span>
                ${categories.length ? `<span class="day-task-dots">${categories.map(category => `<i class="${categoryClass(category)}"></i>`).join("")}</span>` : ""}
                ${dateTasks.length ? `<span class="day-task-count">${dateTasks.length} task${dateTasks.length === 1 ? "" : "s"}</span>` : ""}
            </button>
        `);
    });
    calendarGrid.innerHTML = cells.join("");
    renderSelectedDateTasks();
}

function categoryClass(category) {
    const classes = {
        College: "purple",
        Personal: "green",
        Work: "orange",
        Other: "blue"
    };
    return classes[category] || "blue";
}

function renderSelectedDateTasks() {
    document.getElementById("selectedDateTitle").textContent =
        `Tasks for ${formatDate(selectedCalendarDate)}`;
    renderTaskList(
        document.getElementById("selectedDateTasks"),
        tasks.filter(task => task.date === selectedCalendarDate),
        "No tasks for this date."
    );
}

function renderReminders() {
    const reminderTasks = tasks
        .filter(task => task.reminder && !task.completed)
        .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || "").localeCompare(String(b.time || "")));
    renderTaskList(
        document.getElementById("reminderList"),
        reminderTasks,
        "No active reminders."
    );
}

function renderAll() {
    renderTasks();
    renderDashboard();
    renderCalendar();
    renderReminders();
}

function openPage(pageName) {
    const page = document.getElementById(`${pageName}Page`);
    if (!page) {
        return;
    }

    currentPage = pageName;
    document.querySelectorAll(".page").forEach(item => {
        item.classList.toggle("active", item === page);
    });
    document.querySelectorAll("[data-page]").forEach(link => {
        link.classList.toggle("active", link.getAttribute("data-page") === pageName);
    });
    document.getElementById("pageHeading").textContent = pageHeadings[pageName] || "DailyTasks";

    if (pageName === "tasks") {
        document.getElementById("taskListTitle").textContent =
            currentCategory === "all" ? "All tasks" : `${currentCategory} tasks`;
    }
}

function applyThemeMode(mode) {
    document.body.classList.toggle("dark-mode", mode === "dark");
    setSetting("plannerDarkMode", mode);
    document.querySelectorAll("[data-mode]").forEach(button => {
        button.classList.toggle("selected", button.getAttribute("data-mode") === mode);
    });
}

function applyAccent(color, themeName = "") {
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
        return;
    }
    document.documentElement.style.setProperty("--accent", color);
    setSetting("plannerAccentColor", color);
    setSetting("plannerAccentTheme", themeName);
    const colorPicker = document.getElementById("customColor");
    if (colorPicker) {
        colorPicker.value = color;
    }
    document.querySelectorAll("[data-theme]").forEach(button => {
        button.classList.toggle("selected", button.getAttribute("data-theme") === themeName);
    });
}

function exportTasks() {
    if (!tasks.length) {
        showToast("There are no tasks to export.");
        return;
    }
    const headings = ["Title", "Description", "Date", "Time", "Priority", "Category", "Reminder", "Completed"];
    const rows = tasks.map(task => [
        task.title,
        task.description || "",
        task.date || "",
        task.time || "",
        task.priority || "",
        task.category || "",
        task.reminder ? "Yes" : "No",
        task.completed ? "Yes" : "No"
    ]);
    const csvValue = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headings, ...rows].map(row => row.map(csvValue).join(",")).join("\n");
    const file = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dailytasks-tasks.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function clearTasks() {
    if (!tasks.length) {
        showToast("There are no tasks to delete.");
        return;
    }
    if (!window.confirm("Delete all tasks? This cannot be undone.")) {
        return;
    }
    const previousTasks = tasks;
    tasks = [];
    if (saveTasks()) {
        renderAll();
        showToast("All tasks deleted.");
    } else {
        tasks = previousTasks;
    }
}

async function enableNotifications() {
    if (!("Notification" in window)) {
        showToast("Browser notifications are not available in this browser.");
        return;
    }
    try {
        const permission = await Notification.requestPermission();
        showToast(permission === "granted"
            ? "Notifications enabled while this planner is open."
            : "Notification permission was not granted.");
    } catch (error) {
        console.error("Unable to request browser notification permission.", error);
        showToast("Unable to enable browser notifications.");
    }
}

function checkReminders() {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }
    const now = new Date();
    tasks.forEach(task => {
        const reminderTime = task.time || "09:00";
        const reminderKey = `${task.id}:${task.date}:${reminderTime}`;
        if (
            task.reminder &&
            !task.completed &&
            task.date === getToday() &&
            reminderTime === `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` &&
            !notifiedReminders.has(reminderKey)
        ) {
            new Notification("Planner reminder", { body: task.title });
            notifiedReminders.add(reminderKey);
        }
    });
}

function moveCalendar(direction) {
    if (document.getElementById("calendarView").value === "week") {
        calendarDate.setDate(calendarDate.getDate() + direction * 7);
    } else {
        calendarDate.setMonth(calendarDate.getMonth() + direction, 1);
    }
    renderCalendar();
}

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) {
        return;
    }

    const target = event.target.closest("button, [data-calendar-date]");
    if (!target) {
        return;
    }

    if (target.matches("#addTaskBtn, #welcomeAddBtn, #taskPageAddBtn, #calendarAddBtn")) {
        openTaskModal();
    } else if (target.matches("#closeModalBtn, #cancelModalBtn")) {
        closeTaskModal();
    } else if (target.matches("#themeToggle")) {
        applyThemeMode(document.body.classList.contains("dark-mode") ? "light" : "dark");
    } else if (target.matches("#prevPeriod")) {
        moveCalendar(-1);
    } else if (target.matches("#nextPeriod")) {
        moveCalendar(1);
    } else if (target.matches("#todayBtn")) {
        calendarDate = new Date();
        selectedCalendarDate = getToday();
        renderCalendar();
    } else if (target.matches("#exportBtn")) {
        exportTasks();
    } else if (target.matches("#clearDataBtn")) {
        clearTasks();
    } else if (target.matches("#enableNotificationsBtn")) {
        enableNotifications();
    } else if (target.matches("[data-mode]")) {
        applyThemeMode(target.getAttribute("data-mode"));
    } else if (target.matches("[data-theme]")) {
        const themeName = target.getAttribute("data-theme");
        applyAccent(themeColors[themeName], themeName);
    } else if (target.matches("[data-page]")) {
        const pageName = target.getAttribute("data-page");
        if (pageName === "tasks") {
            currentCategory = "all";
            currentFilter = "all";
            document.getElementById("statusFilter").value = "all";
            document.getElementById("categoryFilter").value = "all";
            document.getElementById("taskListTitle").textContent = "All tasks";
        }
        openPage(pageName);
    } else if (target.matches("[data-open-page]")) {
        openPage(target.getAttribute("data-open-page"));
    } else if (target.matches(".category-link[data-category]")) {
        currentCategory = target.getAttribute("data-category");
        document.getElementById("categoryFilter").value = "all";
        document.getElementById("taskListTitle").textContent = `${currentCategory} tasks`;
        openPage("tasks");
        renderTasks();
    } else if (target.matches("[data-calendar-date]")) {
        selectedCalendarDate = target.getAttribute("data-calendar-date");
        renderCalendar();
    } else if (target.matches('[data-action="edit"]')) {
        editTask(target.getAttribute("data-id"));
    } else if (target.matches('[data-action="delete"]')) {
        deleteTask(target.getAttribute("data-id"));
    }
});

document.addEventListener("change", event => {
    if (!(event.target instanceof Element)) {
        return;
    }
    if (event.target.matches('[data-action="toggle"]')) {
        toggleTask(event.target.getAttribute("data-id"));
    } else if (event.target.matches("#statusFilter")) {
        currentFilter = event.target.value;
        renderTasks();
    } else if (event.target.matches("#priorityFilter, #categoryFilter")) {
        if (event.target.matches("#categoryFilter")) {
            currentCategory = "all";
            document.getElementById("taskListTitle").textContent = "All tasks";
        }
        renderTasks();
    } else if (event.target.matches("#calendarView")) {
        renderCalendar();
    } else if (event.target.matches("#customColor")) {
        applyAccent(event.target.value);
    }
});

document.addEventListener("input", event => {
    if (event.target.matches("#searchInput")) {
        renderTasks();
    }
});

if (taskForm) {
    taskForm.addEventListener("submit", addTask);
}

if (taskTitle) {
    taskTitle.addEventListener("invalid", () => {
        taskTitle.setCustomValidity("Please enter a task title.");
    });
    taskTitle.addEventListener("input", () => taskTitle.setCustomValidity(""));
}

if (taskModal) {
    taskModal.addEventListener("click", event => {
        if (event.target === taskModal) {
            closeTaskModal();
        }
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && taskModal.classList.contains("open")) {
        closeTaskModal();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const savedMode = getSetting("plannerDarkMode");
    applyThemeMode(savedMode === "dark" ? "dark" : "light");
    const savedAccent = getSetting("plannerAccentColor");
    const savedAccentTheme = getSetting("plannerAccentTheme") || "";
    applyAccent(savedAccent || themeColors.lavender, savedAccentTheme);
    document.getElementById("taskModal").setAttribute("aria-hidden", "true");
    renderAll();
    openPage("dashboard");
    checkReminders();
    window.setInterval(checkReminders, 30000);
});
