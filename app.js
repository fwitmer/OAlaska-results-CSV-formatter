// Global state for results data
let resultsData = [];
let originalFileName = "";
let currentViewMode = "sorted"; // 'sorted' or 'original'

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
    
    // Rule 1: Contains 'team', 'and', '&', starts with 'the ', or contains group keywords
    const teamKeywords = /\b(team|society|club|association|squad|crew|duo|trio|group|alliance|union|syndicate|posse)\b/i;
    if (lower.includes('&') || /\band\b/i.test(lower) || lower.startsWith('the ') || teamKeywords.test(lower)) {
        return 'Team';
    }
    
    // Heuristic lists for Men and Women names (generalized based on common US names)
    const womenNames = new Set([
        'sarah', 'addie', 'ruth', 'debora', 'ellyn', 'linda', 'sofia', 'rebecca', 
        'carolyn', 'michelle', 'sweet', 'tamra', 'eeva', 'dela', 'kacie', 'jen',
        'oriana', 'kat', 'angelica',
        'mary', 'patricia', 'jennifer', 'elizabeth', 'barbara', 'susan', 'jessica', 
        'karen', 'lisa', 'nancy', 'betty', 'sandra', 'margaret', 'ashley', 'kimberly', 
        'donna', 'emily', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 
        'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'helen', 'anna', 
        'brenda', 'pamela', 'nicole', 'samantha', 'katherine', 'emma', 'christine', 
        'catherine', 'debra', 'rachel', 'janet', 'virginia', 'maria', 'heather', 
        'diane', 'julie', 'joyce', 'victoria', 'olivia', 'kelly', 'christina', 
        'lauren', 'joan', 'evelyn', 'judith', 'megan', 'cheryl', 'andrea', 'hannah', 
        'martha', 'jacqueline', 'frances', 'gloria', 'ann', 'teresa', 'kathryn', 
        'sara', 'janice', 'jean', 'alice', 'madison', 'doris', 'abigail', 'julia', 
        'judy', 'grace', 'denise', 'amber', 'marilyn', 'beverly', 'danielle', 
        'theresa', 'sophia', 'diana', 'jane', 'lori', 'mildred', 'sally', 'rose', 
        'anne', 'charlotte', 'tracey', 'tammy', 'kathy', 'clara', 'esther', 'flora', 
        'maude', 'florence', 'mabel', 'ida', 'louise', 'hazel', 'annie', 'lillian', 
        'gladys', 'ethel', 'edna', 'pearl', 'ruby', 'goldie', 'bertha', 'minnie', 
        'ellie', 'brittany', 'lindsey', 'jamie', 'abby', 'molly', 'shelly', 'chloe'
    ]);
    
    const menNames = new Set([
        'bjorn', 'oscar', 'steven', 'frank', 'simon', 'ivan', 'warner', 'steve', 
        'bill', 'rowan', 'todd', 'mike', 'paul', 'mark', 'eli', 'michael', 'scott', 
        'cory', 'ian', 'alex', 'dorn', 'max', 'james', 'john', 'robert', 'william', 
        'david', 'richard', 'joseph', 'thomas', 'charles', 'christopher', 'daniel', 
        'matthew', 'anthony', 'donald', 'andrew', 'joshua', 'kenneth', 'kevin', 
        'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 
        'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 
        'brandon', 'benjamin', 'gregory', 'samuel', 'raymond', 'patrick', 'alexander', 
        'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'henry', 'douglas', 
        'peter', 'walter', 'harold', 'harrison', 'kyle', 'carl', 'arthur', 'gerald', 
        'roger', 'keith', 'jeremy', 'terry', 'lawrence', 'sean', 'christian', 'albert', 
        'joe', 'ethan', 'billy', 'bryan', 'bruce', 'jordan', 'ralph', 'roy', 'alan', 
        'wayne', 'eugene', 'juan', 'gabriel', 'louis', 'russell', 'randy', 'vincent', 
        'philip', 'bobby', 'johnny', 'marcus', 'harry', 'sam', 'ben', 'owen', 'leo', 
        'oliver', 'noah', 'liam', 'lucas', 'mason', 'logan', 'ezra', 'levi', 'wyatt', 
        'carter', 'hudson', 'luke', 'hunter', 'cooper', 'miles', 
        'hatcher', 'dwight', 'kenny', 'allan', 'springer', 'axel', 'glen', 'riley',
        'tim', 'jeff', 'colin', 'zach', 'andy', 'doug', 'rick', 'jens', 'ron', 'bob', 
        'hank', 'howard', 'larry', 'lee', 'lester', 'linus', 'martin', 'nate', 'dick'
    ]);
    
    const words = fullName.trim().split(/\s+/).filter(w => w.length > 0);
    const firstWord = words[0] ? words[0].toLowerCase() : '';
    
    // Rule 2: If the first word matches a known gender name, classify immediately
    if (womenNames.has(firstWord)) {
        return 'Women';
    }
    if (menNames.has(firstWord)) {
        return 'Men';
    }
    
    // Rule 3: Phrase check (3 or more words) if name was not recognized in databases
    if (words.length >= 3) {
        return 'Team';
    }
    
    // Rule 4: Plural word heuristic (ends with 's' and has at least 2 words) if first name is unrecognized
    if (lower.endsWith('s') && words.length >= 2) {
        return 'Team';
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

        // Rename Class to Course (done implicitly by variable names)
        
        // Concatenate names
        let name = "";
        if (firstname && lastname) {
            name = `${firstname} ${lastname}`;
        } else {
            name = firstname || lastname || "";
        }

        // Classify (Men, Women, Team)
        const classifiedClass = classifyParticipant(firstname, lastname, course);

        // Handle ResultStatus moving to Position if not 'OK'
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

// Generate fully processed, sorted, and renumbered rows
function getProcessedData() {
    let processedRows = resultsData.map(row => ({ ...row }));

    const courseOrder = ['White', 'Yellow', 'Orange', 'Green', 'Red', 'Short', 'Medium', 'Long', 'Ultra'];
    const classOrder = ['Men', 'Women', 'Team'];

    // Sort by Course, Class, and then Time (ascending)
    processedRows.sort((a, b) => {
        let idxCourseA = courseOrder.indexOf(a.Course);
        let idxCourseB = courseOrder.indexOf(b.Course);
        if (idxCourseA === -1) idxCourseA = 999;
        if (idxCourseB === -1) idxCourseB = 999;
        if (idxCourseA !== idxCourseB) return idxCourseA - idxCourseB;

        let idxClassA = classOrder.indexOf(a.Class);
        let idxClassB = classOrder.indexOf(b.Class);
        if (idxClassA === -1) idxClassA = 999;
        if (idxClassB === -1) idxClassB = 999;
        if (idxClassA !== idxClassB) return idxClassA - idxClassB;

        let nonNumA = isNonNumerical(a.Position);
        let nonNumB = isNonNumerical(b.Position);
        if (nonNumA && !nonNumB) return 1;
        if (!nonNumA && nonNumB) return -1;

        return timeToSeconds(a.Time) - timeToSeconds(b.Time);
    });

    // Renumber Position within each unique Course/Class group, and format Times
    let currentCourse = null;
    let currentClass = null;
    let rank = 1;

    processedRows.forEach((row) => {
        if (row.Course !== currentCourse || row.Class !== currentClass) {
            currentCourse = row.Course;
            currentClass = row.Class;
            rank = 1;
        }

        if (!isNonNumerical(row.Position)) {
            row.Position = rank.toString();
            rank++;
        }

        row.Time = formatTime(row.Time);
    });

    return processedRows;
}

// Render results in table with edit capabilities
function renderTable() {
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";

    let rowsToDisplay = [];
    if (currentViewMode === "sorted") {
        rowsToDisplay = getProcessedData();
    } else {
        // Display in original index order
        rowsToDisplay = resultsData.map(row => ({ ...row })).sort((a, b) => a.id - b.id);
    }

    let prevCourse = null;
    let prevClass = null;

    rowsToDisplay.forEach((row) => {
        // Insert separator row in sorted view mode when switching groups
        if (currentViewMode === "sorted" && prevCourse !== null && prevClass !== null) {
            if (row.Course !== prevCourse || row.Class !== prevClass) {
                const separatorTr = document.createElement("tr");
                separatorTr.className = "table-separator";
                const separatorTd = document.createElement("td");
                separatorTd.colSpan = 6;
                separatorTr.appendChild(separatorTd);
                tbody.appendChild(separatorTr);
            }
        }

        const tr = document.createElement("tr");
        tr.dataset.id = row.id;

        // Course input
        const tdCourse = document.createElement("td");
        const inputCourse = document.createElement("input");
        inputCourse.className = "editable-cell";
        inputCourse.value = row.Course;
        inputCourse.addEventListener("change", (e) => {
            let originalRow = resultsData.find(r => r.id === row.id);
            if (originalRow) {
                originalRow.Course = e.target.value;
                updateStats();
                renderTable();
            }
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
            let originalRow = resultsData.find(r => r.id === row.id);
            if (originalRow) {
                originalRow.Class = e.target.value;
                updateStats();
                renderTable();
            }
        });
        tdClass.appendChild(selectClass);

        // Position input
        const tdPosition = document.createElement("td");
        const inputPosition = document.createElement("input");
        inputPosition.className = "editable-cell";
        inputPosition.value = row.Position;
        inputPosition.placeholder = currentViewMode === "sorted" ? "Auto" : "";
        
        // In sorted view, ranks are auto-calculated, but let them edit non-numerical values (MP, DNF)
        inputPosition.addEventListener("change", (e) => {
            let originalRow = resultsData.find(r => r.id === row.id);
            if (originalRow) {
                originalRow.Position = e.target.value;
                renderTable();
            }
        });
        tdPosition.appendChild(inputPosition);

        // Name input
        const tdName = document.createElement("td");
        const inputName = document.createElement("input");
        inputName.className = "editable-cell";
        inputName.value = row.Name;
        inputName.addEventListener("change", (e) => {
            let originalRow = resultsData.find(r => r.id === row.id);
            if (originalRow) {
                originalRow.Name = e.target.value;
                renderTable();
            }
        });
        tdName.appendChild(inputName);

        // Time input
        const tdTime = document.createElement("td");
        const inputTime = document.createElement("input");
        inputTime.className = "editable-cell";
        inputTime.value = row.Time;
        inputTime.addEventListener("change", (e) => {
            let originalRow = resultsData.find(r => r.id === row.id);
            if (originalRow) {
                originalRow.Time = e.target.value;
                renderTable();
            }
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
            renderTable();
        });
        tdActions.appendChild(btnDelete);

        tr.appendChild(tdCourse);
        tr.appendChild(tdClass);
        tr.appendChild(tdPosition);
        tr.appendChild(tdName);
        tr.appendChild(tdTime);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);

        prevCourse = row.Course;
        prevClass = row.Class;
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
    const viewSortedBtn = document.getElementById("view-sorted-btn");
    const viewOriginalBtn = document.getElementById("view-original-btn");

    resetBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to reset all modifications?")) {
            document.getElementById("editor-card").classList.add("hidden");
            document.getElementById("upload-card").classList.remove("hidden");
            document.getElementById("file-input").value = "";
            resultsData = [];
            currentViewMode = "sorted";
            viewSortedBtn.classList.add("active");
            viewOriginalBtn.classList.remove("active");
        }
    });

    downloadBtn.addEventListener("click", () => {
        exportCSV();
    });

    viewSortedBtn.addEventListener("click", () => {
        if (currentViewMode !== 'sorted') {
            currentViewMode = 'sorted';
            viewSortedBtn.classList.add("active");
            viewOriginalBtn.classList.remove("active");
            renderTable();
        }
    });

    viewOriginalBtn.addEventListener("click", () => {
        if (currentViewMode !== 'original') {
            currentViewMode = 'original';
            viewOriginalBtn.classList.add("active");
            viewSortedBtn.classList.remove("active");
            renderTable();
        }
    });
}

// Generate output CSV
function exportCSV() {
    if (resultsData.length === 0) return;

    // Get processed (sorted, renumbered, formatted) data
    let processedRows = getProcessedData();

    // Construct CSV rows and insert spacer rows
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

    // Generate CSV string manually
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
