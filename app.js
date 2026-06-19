// Global state for results data
let resultsData = [];
let originalFileName = "";

// Helper to check if a value is non-numerical (e.g. MP, DNF, DNS, DSQ)
function isNonNumerical(pos) {
    if (pos === undefined || pos === null) return false;
    const str = pos.toString().trim();
    if (str === '') return false;
    return isNaN(Number(str));
}

// Convert HH:MM:SS to total seconds for sorting
function timeToSeconds(timeStr) {
    if (!timeStr) return Infinity;
    const parts = timeStr.trim().split(':');
    if (parts.length === 3) {
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        const s = parseInt(parts[2], 10) || 0;
        return h * 3600 + m * 60 + s;
    }
    return Infinity;
}

// Format time to remove leading hour zero (e.g. 01:23:45 -> 1:23:45)
function formatTime(timeStr) {
    if (!timeStr) return '';
    const trimmed = timeStr.trim();
    const match = trimmed.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
        const h = parseInt(match[1], 10);
        return `${h}:${match[2]}:${match[3]}`;
    }
    return trimmed;
}

// Classify name into Men, Women, or Team
function classifyParticipant(firstName, lastName, course) {
    // Concatenate names first
    let fullName = "";
    if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
    } else {
        fullName = firstName || lastName || "";
    }
    
    const lower = fullName.toLowerCase();
    
    // Rule 1: Contains 'team', 'and', '&'
    if (lower.includes('team') || /\band\b/.test(lower) || lower.includes('&')) {
        return 'Team';
    }
    
    // Rule 2: Phrase check (3 or more words)
    const words = fullName.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 3) {
        return 'Team';
    }
    
    // Heuristic lists for Men and Women names
    const womenNames = new Set([
        'sarah', 'addie', 'ruth', 'debora', 'ellyn', 'linda', 'sofia', 'rebecca', 
        'carolyn', 'michelle', 'sweet', 'tamra', 'eeva', 'dela', 'kacie', 'jen',
        'jane', 'mary', 'elizabeth', 'jennifer', 'maria', 'susan', 'margaret', 
        'dorothy', 'lisa', 'karen', 'helen', 'sandra', 'donna', 'carol', 'sharon', 
        'laura', 'kimberly', 'deborah', 'jessica', 'shirley', 'cynthia', 'angela', 
        'melissa', 'brenda', 'amy', 'anna'
    ]);
    
    const menNames = new Set([
        'bjorn', 'oscar', 'steven', 'frank', 'simon', 'ivan', 'warner', 'steve', 
        'bill', 'rowan', 'todd', 'mike', 'paul', 'mark', 'eli', 'michael', 'scott', 
        'cory', 'ian', 'alex', 'dorn', 'max', 'john', 'robert', 'james', 'william', 
        'charles', 'thomas', 'walter', 'joseph', 'arthur', 'henry', 'george', 
        'edward', 'richard', 'donald', 'roy', 'fred', 'albert', 'harold', 'harry', 
        'clarence'
    ]);
    
    const firstWord = words[0] ? words[0].toLowerCase() : '';
    if (womenNames.has(firstWord)) {
        return 'Women';
    }
    if (menNames.has(firstWord)) {
        return 'Men';
    }
    
    // Default fallback
    return 'Men';
}

// Initialize Lucide Icons
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initUpload();
    initEditor();
});

// Setup drag and drop file upload
function initUpload() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

// Ingest CSV file
function handleFile(file) {
    if (!file.name.endsWith(".csv")) {
        alert("Please upload a valid .csv file.");
        return;
    }
    
    originalFileName = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseCSV(text);
    };
    reader.readAsText(file);
}

// Parse Semicolon-delimited CSV using PapaParse
function parseCSV(csvText) {
    Papa.parse(csvText, {
        delimiter: ";",
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                console.warn("Parsing warnings:", results.errors);
            }
            processRawData(results.data);
        },
        error: function(err) {
            alert("Error parsing CSV file: " + err.message);
        }
    });
}

// Process raw CSV data to intermediate representation
function processRawData(data) {
    resultsData = data.map((row, index) => {
        // Resolve headers flexibly (case-insensitive and optional plural)
        const getField = (possibleKeys) => {
            for (const key of possibleKeys) {
                const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '') === key.toLowerCase());
                if (foundKey) return row[foundKey];
            }
            return '';
        };

        const course = getField(['class', 'course']);
        const firstname = getField(['firstname', 'firstname']);
        const lastname = getField(['lastname', 'lastname']);
        const position = getField(['position']);
        const time = getField(['time']);
        const resultStatus = getField(['resultstatus', 'resultsstatus']);

        // 1. Rename Class to Course (done implicitly by variable names)
        
        // 2. Concatenate names
        let name = "";
        if (firstname && lastname) {
            name = `${firstname} ${lastname}`;
        } else {
            name = firstname || lastname || "";
        }

        // 3. Classify (Men, Women, Team)
        const classifiedClass = classifyParticipant(firstname, lastname, course);

        // 4. Handle ResultStatus moving to Position if not 'OK'
        let finalPosition = position;
        if (resultStatus && resultStatus.trim().toUpperCase() !== 'OK') {
            finalPosition = resultStatus.trim();
        }

        return {
            id: index,
            Course: course ? course.trim() : '',
            Class: classifiedClass,
            Position: finalPosition ? finalPosition.trim() : '',
            Name: name,
            Time: time ? time.trim() : ''
        };
    });

    renderTable();
    updateStats();
    
    // Switch UI panels
    document.getElementById("upload-card").classList.add("hidden");
    document.getElementById("editor-card").classList.remove("hidden");
}

// Render results in table with edit capabilities
function renderTable() {
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";

    resultsData.forEach((row) => {
        const tr = document.createElement("tr");
        tr.dataset.id = row.id;

        // Course input
        const tdCourse = document.createElement("td");
        const inputCourse = document.createElement("input");
        inputCourse.className = "editable-cell";
        inputCourse.value = row.Course;
        inputCourse.addEventListener("change", (e) => {
            row.Course = e.target.value;
            updateStats();
        });
        tdCourse.appendChild(inputCourse);

        // Class dropdown select
        const tdClass = document.createElement("td");
        const selectClass = document.createElement("select");
        selectClass.className = "class-select";
        ['Men', 'Women', 'Team'].forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            if (row.Class === c) opt.selected = true;
            selectClass.appendChild(opt);
        });
        selectClass.addEventListener("change", (e) => {
            row.Class = e.target.value;
            updateStats();
        });
        tdClass.appendChild(selectClass);

        // Position input
        const tdPosition = document.createElement("td");
        const inputPosition = document.createElement("input");
        inputPosition.className = "editable-cell";
        inputPosition.value = row.Position;
        inputPosition.placeholder = "Auto";
        inputPosition.addEventListener("change", (e) => {
            row.Position = e.target.value;
        });
        tdPosition.appendChild(inputPosition);

        // Name input
        const tdName = document.createElement("td");
        const inputName = document.createElement("input");
        inputName.className = "editable-cell";
        inputName.value = row.Name;
        inputName.addEventListener("change", (e) => {
            row.Name = e.target.value;
        });
        tdName.appendChild(inputName);

        // Time input
        const tdTime = document.createElement("td");
        const inputTime = document.createElement("input");
        inputTime.className = "editable-cell";
        inputTime.value = row.Time;
        inputTime.addEventListener("change", (e) => {
            row.Time = e.target.value;
        });
        tdTime.appendChild(inputTime);

        // Actions (Delete row)
        const tdActions = document.createElement("td");
        const btnDelete = document.createElement("button");
        btnDelete.className = "btn-danger";
        btnDelete.innerHTML = "Delete";
        btnDelete.addEventListener("click", () => {
            resultsData = resultsData.filter(r => r.id !== row.id);
            tr.remove();
            updateStats();
        });
        tdActions.appendChild(btnDelete);

        tr.appendChild(tdCourse);
        tr.appendChild(tdClass);
        tr.appendChild(tdPosition);
        tr.appendChild(tdName);
        tr.appendChild(tdTime);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

// Update UI Stats
function updateStats() {
    document.getElementById("stat-total").textContent = resultsData.length;
    document.getElementById("stat-teams").textContent = resultsData.filter(r => r.Class === 'Team').length;
    document.getElementById("stat-men").textContent = resultsData.filter(r => r.Class === 'Men').length;
    document.getElementById("stat-women").textContent = resultsData.filter(r => r.Class === 'Women').length;
}

// Setup Editor Panel action buttons
function initEditor() {
    const resetBtn = document.getElementById("reset-btn");
    const downloadBtn = document.getElementById("download-btn");

    resetBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to reset all modifications?")) {
            document.getElementById("editor-card").classList.add("hidden");
            document.getElementById("upload-card").classList.remove("hidden");
            document.getElementById("file-input").value = "";
            resultsData = [];
        }
    });

    downloadBtn.addEventListener("click", () => {
        exportCSV();
    });
}

// Apply sorting, renumbering, formatting, and generate output CSV
function exportCSV() {
    if (resultsData.length === 0) return;

    // 1. Clone data for processing
    let processedRows = resultsData.map(row => ({ ...row }));

    // Fixed order lists for sorting
    const courseOrder = ['White', 'Yellow', 'Orange', 'Green', 'Red'];
    const classOrder = ['Men', 'Women', 'Team'];

    // 2. Sort by Course, Class, and then Time (ascending)
    processedRows.sort((a, b) => {
        // Course sorting
        let idxCourseA = courseOrder.indexOf(a.Course);
        let idxCourseB = courseOrder.indexOf(b.Course);
        if (idxCourseA === -1) idxCourseA = 999;
        if (idxCourseB === -1) idxCourseB = 999;
        if (idxCourseA !== idxCourseB) return idxCourseA - idxCourseB;

        // Class sorting
        let idxClassA = classOrder.indexOf(a.Class);
        let idxClassB = classOrder.indexOf(b.Class);
        if (idxClassA === -1) idxClassA = 999;
        if (idxClassB === -1) idxClassB = 999;
        if (idxClassA !== idxClassB) return idxClassA - idxClassB;

        // Position status check: non-numerical (MP, DNF) always goes to bottom
        let nonNumA = isNonNumerical(a.Position);
        let nonNumB = isNonNumerical(b.Position);
        if (nonNumA && !nonNumB) return 1;
        if (!nonNumA && nonNumB) return -1;

        // If both status are OK (or both MP), sort by Time ascending
        return timeToSeconds(a.Time) - timeToSeconds(b.Time);
    });

    // 3. Renumber Position within each unique Course/Class group, and format Times
    let currentCourse = null;
    let currentClass = null;
    let rank = 1;

    processedRows.forEach((row) => {
        // Check if group changed
        if (row.Course !== currentCourse || row.Class !== currentClass) {
            currentCourse = row.Course;
            currentClass = row.Class;
            rank = 1;
        }

        // Renumber numerical values, preserve non-numerical
        if (!isNonNumerical(row.Position)) {
            row.Position = rank.toString();
            rank++;
        }

        // Format times to remove leading hour zero
        row.Time = formatTime(row.Time);
    });

    // 4. Construct CSV rows and insert spaces between unique Course/Class groups
    const csvRows = [['Course', 'Class', 'Position', 'Name', 'Time']];
    let prevCourse = null;
    let prevClass = null;

    processedRows.forEach((row) => {
        // Insert a space line after each unique Course/Class group (except the first)
        if (prevCourse !== null && prevClass !== null) {
            if (row.Course !== prevCourse || row.Class !== prevClass) {
                // Separator row: Course="", Class="", Position="", Name=" ", Time=""
                csvRows.push(['', '', '', ' ', '']);
            }
        }
        
        csvRows.push([
            row.Course,
            row.Class,
            row.Position,
            row.Name,
            row.Time
        ]);

        prevCourse = row.Course;
        prevClass = row.Class;
    });

    // Generate CSV string manually to match line endings and quote requirements exactly
    // In results_abbottloop2026_edited.csv, fields are comma-separated and not quoted.
    const csvContent = csvRows
        .map(row => row.join(','))
        .join('\r\n') + '\r\n'; // Suffix trailing newline

    // Trigger file download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Construct new file name
    let newFileName = "edited_results.csv";
    if (originalFileName) {
        newFileName = originalFileName.replace("_compact.csv", "_edited.csv");
        if (newFileName === originalFileName) {
            newFileName = "edited_" + originalFileName;
        }
    }
    
    link.setAttribute("href", url);
    link.setAttribute("download", newFileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
