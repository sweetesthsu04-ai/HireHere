/**
 * HireHere.com frontend prototype
 *
 * Data lives in localStorage only. Replace the storage helpers later with
 * real API calls. Do not treat this as a production backend.
 *
 * SECURITY: Passwords are stored in plain text for this demo. A real product
 * must authenticate on a server and hash passwords (never store them like this).
 */

/* ========== Storage keys ========== */
var KEY_USERS = "hirehere_users";
var KEY_JOBS = "hirehere_jobs";
var KEY_APPLICATIONS = "hirehere_applications";
var KEY_SAVED = "hirehere_saved_jobs";
var KEY_CURRENT = "hirehere_current_user";
var KEY_PROFILES = "hirehere_profiles";

var CATEGORIES = [
  "IT & Software",
  "Marketing",
  "Sales",
  "Finance",
  "Engineering",
  "Healthcare",
  "Education",
  "Design",
  "Customer Service",
  "Human Resources"
];

var APP_STATUSES = [
  "Pending",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Accepted",
  "Rejected",
  "Hired"
];

/* ========== Storage helpers (swap these for API calls later) ========== */
function readJson(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn("HireHere could not read", key, err);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
  return readJson(KEY_USERS, []);
}
function saveUsers(users) {
  writeJson(KEY_USERS, users);
}
function getJobs() {
  return readJson(KEY_JOBS, []);
}
function saveJobs(jobs) {
  writeJson(KEY_JOBS, jobs);
}
function getApplications() {
  return readJson(KEY_APPLICATIONS, []);
}
function saveApplications(apps) {
  writeJson(KEY_APPLICATIONS, apps);
}
function getSavedJobs() {
  return readJson(KEY_SAVED, []);
}
function saveSavedJobs(rows) {
  writeJson(KEY_SAVED, rows);
}
function getProfiles() {
  return readJson(KEY_PROFILES, []);
}
function saveProfiles(profiles) {
  writeJson(KEY_PROFILES, profiles);
}
function getCurrentUser() {
  return readJson(KEY_CURRENT, null);
}
function saveCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(KEY_CURRENT);
    return;
  }
  var safe = Object.assign({}, user);
  writeJson(KEY_CURRENT, safe);
}
function logoutUser() {
  localStorage.removeItem(KEY_CURRENT);
}

function makeId(prefix) {
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "";
  var d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getQuery(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(function (p) { return p[0].toUpperCase(); })
    .join("");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function effectiveJobStatus(job) {
  if (!job) return "Closed";
  if (job.status === "Closed") return "Closed";
  if (job.deadline && job.deadline < todayIso()) return "Expired";
  return job.status || "Active";
}

function canApplyToJob(job) {
  return effectiveJobStatus(job) === "Active";
}

function salaryLabel(amount) {
  return "$" + Number(amount).toLocaleString() + " / month";
}

function matchesSalaryFilter(amount, band) {
  var n = Number(amount);
  if (!band) return true;
  if (band === "under500") return n < 500;
  if (band === "500-1000") return n >= 500 && n <= 1000;
  if (band === "1000-2000") return n > 1000 && n <= 2000;
  if (band === "2000plus") return n > 2000;
  return true;
}

function getProfile(userId) {
  var list = getProfiles();
  for (var i = 0; i < list.length; i++) {
    if (list[i].userId === userId) return list[i];
  }
  return null;
}

function upsertProfile(profile) {
  var list = getProfiles();
  var found = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i].userId === profile.userId) {
      list[i] = profile;
      found = true;
      break;
    }
  }
  if (!found) list.push(profile);
  saveProfiles(list);
}

function getUserById(id) {
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) return users[i];
  }
  return null;
}

function getJobById(id) {
  var jobs = getJobs();
  for (var i = 0; i < jobs.length; i++) {
    if (jobs[i].id === id) return jobs[i];
  }
  return null;
}

function applicationCount(jobId) {
  return getApplications().filter(function (a) { return a.jobId === jobId; }).length;
}

function hasApplied(candidateId, jobId) {
  return getApplications().some(function (a) {
    return a.candidateId === candidateId && a.jobId === jobId;
  });
}

function isSaved(userId, jobId) {
  return getSavedJobs().some(function (s) {
    return s.userId === userId && s.jobId === jobId;
  });
}

function toggleSave(userId, jobId) {
  var rows = getSavedJobs();
  var idx = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].userId === userId && rows[i].jobId === jobId) idx = i;
  }
  if (idx >= 0) {
    rows.splice(idx, 1);
    saveSavedJobs(rows);
    return false;
  }
  rows.push({ userId: userId, jobId: jobId });
  saveSavedJobs(rows);
  return true;
}

function statusBadgeClass(status) {
  var map = {
    Pending: "badge-pending",
    "Under Review": "badge-review",
    Shortlisted: "badge-shortlisted",
    Interview: "badge-interview",
    Accepted: "badge-accepted",
    Rejected: "badge-rejected",
    Hired: "badge-hired",
    Active: "badge-active",
    Closed: "badge-closed",
    Expired: "badge-expired"
  };
  return "badge " + (map[status] || "");
}

/* ========== Sample data (seeded once) ========== */
function seedIfNeeded() {
  if (getUsers().length) return;

  var users = [
    { id: "user-e-01", role: "employer", fullName: "Nay Chi", email: "employer@hirehere.com", phone: "+95 9 250 111 001", password: "demo123", location: "Yangon", companyName: "Horizon Tech" },
    { id: "user-e-02", role: "employer", fullName: "Soe Win", email: "marketing@brightpath.com", phone: "+95 9 250 111 002", password: "demo123", location: "Yangon", companyName: "BrightPath Marketing" },
    { id: "user-e-03", role: "employer", fullName: "Aye Aye", email: "hr@riverbank.finance", phone: "+95 9 250 111 003", password: "demo123", location: "Yangon", companyName: "Riverbank Finance" },
    { id: "user-e-04", role: "employer", fullName: "Dr. Hlaing", email: "jobs@carefirst.clinic", phone: "+95 9 250 111 004", password: "demo123", location: "Mandalay", companyName: "CareFirst Clinic" },
    { id: "user-e-05", role: "employer", fullName: "U Myint", email: "hire@greenleaf.edu", phone: "+95 9 250 111 005", password: "demo123", location: "Naypyidaw", companyName: "GreenLeaf Education" },
    { id: "user-e-06", role: "employer", fullName: "Htet Aung", email: "talent@apexeng.com", phone: "+95 9 250 111 006", password: "demo123", location: "Yangon", companyName: "Apex Engineering" },
    { id: "user-s-01", role: "seeker", fullName: "Aung Min", email: "seeker@hirehere.com", phone: "+95 9 400 200 001", password: "demo123", location: "Yangon" },
    { id: "user-s-02", role: "seeker", fullName: "Thiri Aye", email: "thiri.aye@email.com", phone: "+95 9 400 200 002", password: "demo123", location: "Mandalay" },
    { id: "user-s-03", role: "seeker", fullName: "Ko Ko Naing", email: "koko.naing@email.com", phone: "+95 9 400 200 003", password: "demo123", location: "Yangon" },
    { id: "user-s-04", role: "seeker", fullName: "Su Myat", email: "su.myat@email.com", phone: "+95 9 400 200 004", password: "demo123", location: "Yangon" },
    { id: "user-s-05", role: "seeker", fullName: "Hnin Wai", email: "hnin.wai@email.com", phone: "+95 9 400 200 005", password: "demo123", location: "Remote" },
    { id: "user-s-06", role: "seeker", fullName: "Zaw Lin", email: "zaw.lin@email.com", phone: "+95 9 400 200 006", password: "demo123", location: "Yangon" },
    { id: "user-s-07", role: "seeker", fullName: "May Thu", email: "may.thu@email.com", phone: "+95 9 400 200 007", password: "demo123", location: "Naypyidaw" },
    { id: "user-s-08", role: "seeker", fullName: "Kyaw Zin", email: "kyaw.zin@email.com", phone: "+95 9 400 200 008", password: "demo123", location: "Yangon" },
    { id: "user-s-09", role: "seeker", fullName: "Ei Phyu", email: "ei.phyu@email.com", phone: "+95 9 400 200 009", password: "demo123", location: "Mandalay" },
    { id: "user-s-10", role: "seeker", fullName: "Min Khant", email: "min.khant@email.com", phone: "+95 9 400 200 010", password: "demo123", location: "Yangon" },
    { id: "user-s-11", role: "seeker", fullName: "Nandar Htun", email: "nandar.htun@email.com", phone: "+95 9 400 200 011", password: "demo123", location: "Yangon" },
    { id: "user-s-12", role: "seeker", fullName: "Pyae Sone", email: "pyae.sone@email.com", phone: "+95 9 400 200 012", password: "demo123", location: "Mandalay" }
  ];

  var profiles = [
    { userId: "user-e-01", companyDescription: "Horizon Tech builds web and mobile products for businesses in Myanmar.", website: "https://horizon.example", about: "A growing software team focused on quality and mentoring." },
    { userId: "user-e-02", companyDescription: "BrightPath helps brands grow with digital campaigns.", website: "https://brightpath.example", about: "Full-service marketing studio." },
    { userId: "user-e-03", companyDescription: "Riverbank Finance provides accounting and advisory services.", website: "https://riverbank.example", about: "Trusted finance partner." },
    { userId: "user-e-04", companyDescription: "CareFirst Clinic delivers community healthcare.", website: "https://carefirst.example", about: "Patient-first clinic network." },
    { userId: "user-e-05", companyDescription: "GreenLeaf Education runs schools and tutoring programs.", website: "https://greenleaf.example", about: "Learning that lasts." },
    { userId: "user-e-06", companyDescription: "Apex Engineering delivers electrical and civil projects.", website: "https://apexeng.example", about: "Safety and reliability first." },
    { userId: "user-s-01", professionalTitle: "Frontend Developer", about: "I build clean, accessible websites with HTML, CSS, and JavaScript.", skills: ["HTML", "CSS", "JavaScript", "Responsive Design"], education: "B.C.Sc, University of Computer Studies, Yangon", experienceText: "3 years building marketing sites and dashboards.", experienceLevel: "Mid Level", category: "IT & Software", resume: "Aung_Min_Resume.pdf" },
    { userId: "user-s-02", professionalTitle: "Backend Developer", about: "API design, databases, and reliable services.", skills: ["Java", "SQL", "REST APIs"], education: "B.C.Tech, UCS Mandalay", experienceText: "4 years in enterprise backends.", experienceLevel: "Mid Level", category: "IT & Software", resume: "Thiri_Aye_Resume.pdf" },
    { userId: "user-s-03", professionalTitle: "Full Stack Developer", about: "End-to-end web apps from UI to database.", skills: ["JavaScript", "Node-ready concepts", "SQL", "HTML"], education: "B.Sc Computer Science", experienceText: "5 years shipping product features.", experienceLevel: "Senior Level", category: "IT & Software", resume: "KoKo_Naing_Resume.pdf" },
    { userId: "user-s-04", professionalTitle: "Graphic Designer", about: "Brand systems, posters, and social visuals.", skills: ["Photoshop", "Illustrator", "Branding"], education: "Diploma in Graphic Design", experienceText: "2 years at a creative studio.", experienceLevel: "Entry Level", category: "Design", resume: "Su_Myat_Resume.pdf" },
    { userId: "user-s-05", professionalTitle: "UI/UX Designer", about: "User research, wireframes, and design systems.", skills: ["Figma", "User Research", "Prototyping"], education: "BA Design", experienceText: "4 years product design, remote-friendly.", experienceLevel: "Mid Level", category: "Design", resume: "Hnin_Wai_Resume.pdf" },
    { userId: "user-s-06", professionalTitle: "Digital Marketing Specialist", about: "SEO, ads, and content that converts.", skills: ["SEO", "Google Ads", "Content"], education: "BBA Marketing", experienceText: "3 years performance marketing.", experienceLevel: "Mid Level", category: "Marketing", resume: "Zaw_Lin_Resume.pdf" },
    { userId: "user-s-07", professionalTitle: "Accountant", about: "Bookkeeping, reporting, and tax support.", skills: ["Excel", "QuickBooks", "IFRS basics"], education: "B.Acc", experienceText: "6 years in SME accounting.", experienceLevel: "Senior Level", category: "Finance", resume: "May_Thu_Resume.pdf" },
    { userId: "user-s-08", professionalTitle: "Sales Executive", about: "B2B outreach and relationship selling.", skills: ["Negotiation", "CRM", "Presentations"], education: "BBA", experienceText: "3 years SaaS and services sales.", experienceLevel: "Mid Level", category: "Sales", resume: "Kyaw_Zin_Resume.pdf" },
    { userId: "user-s-09", professionalTitle: "Teacher", about: "Secondary English with student-centered lessons.", skills: ["Lesson Planning", "Classroom Management", "English"], education: "B.Ed", experienceText: "7 years in public and private schools.", experienceLevel: "Senior Level", category: "Education", resume: "Ei_Phyu_Resume.pdf" },
    { userId: "user-s-10", professionalTitle: "Data Analyst", about: "Dashboards, SQL, and clear insights for teams.", skills: ["SQL", "Excel", "Power BI", "Python basics"], education: "B.Sc Statistics", experienceText: "2 years analytics for retail.", experienceLevel: "Entry Level", category: "IT & Software", resume: "Min_Khant_Resume.pdf" },
    { userId: "user-s-11", professionalTitle: "HR Assistant", about: "Recruiting coordination and employee records.", skills: ["Recruiting", "MS Office", "Onboarding"], education: "BA Human Resources", experienceText: "2 years HR operations.", experienceLevel: "Entry Level", category: "Human Resources", resume: "Nandar_Htun_Resume.pdf" },
    { userId: "user-s-12", professionalTitle: "Electrical Engineer", about: "Power systems and on-site electrical design.", skills: ["AutoCAD", "Electrical Design", "Safety"], education: "B.E Electrical", experienceText: "5 years on industrial projects.", experienceLevel: "Mid Level", category: "Engineering", resume: "Pyae_Sone_Resume.pdf" }
  ];

  function job(data) {
    return data;
  }

  var jobs = [
    job({ id: "job-001", employerId: "user-e-01", companyName: "Horizon Tech", title: "Frontend Developer", category: "IT & Software", location: "Yangon", salaryAmount: 900, jobType: "Full Time", experience: "Mid Level", workMode: "Hybrid", deadline: "2026-10-15", postedDate: "2026-08-12", status: "Active", featured: true, description: "Build user interfaces for HireHere-style products and client dashboards.", responsibilities: "Implement responsive pages, work with designers, test in major browsers.", requirements: "Strong HTML, CSS, and JavaScript. Portfolio of live sites.", skills: ["HTML", "CSS", "JavaScript"], benefits: "Health allowance, learning budget, hybrid days." }),
    job({ id: "job-002", employerId: "user-e-01", companyName: "Horizon Tech", title: "Backend Developer", category: "IT & Software", location: "Yangon", salaryAmount: 1100, jobType: "Full Time", experience: "Mid Level", workMode: "On-site", deadline: "2026-10-20", postedDate: "2026-08-10", status: "Active", featured: true, description: "Design APIs and data models for our job marketplace services.", responsibilities: "Write services, review code, document endpoints.", requirements: "Experience with APIs and relational data.", skills: ["Java", "SQL", "REST APIs"], benefits: "Meal support, overtime policy, mentoring." }),
    job({ id: "job-003", employerId: "user-e-01", companyName: "Horizon Tech", title: "Full Stack Developer", category: "IT & Software", location: "Remote", salaryAmount: 1400, jobType: "Contract", experience: "Senior Level", workMode: "Remote", deadline: "2026-09-30", postedDate: "2026-08-08", status: "Active", featured: true, description: "Own features from database to UI for a 6-month product sprint.", responsibilities: "Ship weekly increments, pair with product, keep quality high.", requirements: "5+ years web development.", skills: ["JavaScript", "SQL", "HTML"], benefits: "Flexible hours, home office stipend." }),
    job({ id: "job-004", employerId: "user-e-02", companyName: "BrightPath Marketing", title: "Graphic Designer", category: "Design", location: "Yangon", salaryAmount: 550, jobType: "Full Time", experience: "Entry Level", workMode: "On-site", deadline: "2026-09-25", postedDate: "2026-08-14", status: "Active", featured: false, description: "Create campaign visuals for social and print.", responsibilities: "Design ads, maintain brand kit, prepare print files.", requirements: "Portfolio showing branding work.", skills: ["Photoshop", "Illustrator"], benefits: "Studio snacks, festival bonus." }),
    job({ id: "job-005", employerId: "user-e-02", companyName: "BrightPath Marketing", title: "UI/UX Designer", category: "Design", location: "Yangon", salaryAmount: 850, jobType: "Full Time", experience: "Mid Level", workMode: "Hybrid", deadline: "2026-10-01", postedDate: "2026-08-11", status: "Active", featured: true, description: "Improve conversion and usability for client websites.", responsibilities: "Research, wireframe, prototype, hand off to developers.", requirements: "Figma fluency and case studies.", skills: ["Figma", "User Research"], benefits: "Hybrid week, design conference ticket." }),
    job({ id: "job-006", employerId: "user-e-02", companyName: "BrightPath Marketing", title: "Digital Marketing Specialist", category: "Marketing", location: "Yangon", salaryAmount: 700, jobType: "Full Time", experience: "Mid Level", workMode: "On-site", deadline: "2026-09-18", postedDate: "2026-08-09", status: "Active", featured: false, description: "Plan and run paid and organic digital campaigns.", responsibilities: "Manage ads, report weekly, test landing pages.", requirements: "Hands-on Google Ads or Facebook Ads.", skills: ["SEO", "Google Ads"], benefits: "Performance bonus." }),
    job({ id: "job-007", employerId: "user-e-03", companyName: "Riverbank Finance", title: "Accountant", category: "Finance", location: "Yangon", salaryAmount: 800, jobType: "Full Time", experience: "Mid Level", workMode: "On-site", deadline: "2026-10-05", postedDate: "2026-08-07", status: "Active", featured: false, description: "Support month-end close and client bookkeeping.", responsibilities: "Reconcile accounts, prepare reports, assist audits.", requirements: "Accounting degree and Excel skill.", skills: ["Excel", "Bookkeeping"], benefits: "Professional exam support." }),
    job({ id: "job-008", employerId: "user-e-03", companyName: "Riverbank Finance", title: "Sales Executive", category: "Sales", location: "Yangon", salaryAmount: 600, jobType: "Full Time", experience: "Entry Level", workMode: "On-site", deadline: "2026-09-22", postedDate: "2026-08-13", status: "Active", featured: false, description: "Sell advisory packages to SMEs.", responsibilities: "Prospect, meet clients, keep CRM updated.", requirements: "Confident communicator.", skills: ["Negotiation", "CRM"], benefits: "Commission plus base." }),
    job({ id: "job-009", employerId: "user-e-01", companyName: "Horizon Tech", title: "HR Assistant", category: "Human Resources", location: "Yangon", salaryAmount: 500, jobType: "Part Time", experience: "Entry Level", workMode: "On-site", deadline: "2026-09-12", postedDate: "2026-08-15", status: "Active", featured: false, description: "Help schedule interviews and maintain candidate files.", responsibilities: "Coordinate calendars, update spreadsheets, greet candidates.", requirements: "Organized and discreet.", skills: ["MS Office", "Recruiting"], benefits: "Flexible afternoon hours." }),
    job({ id: "job-010", employerId: "user-e-01", companyName: "Horizon Tech", title: "Software Engineer", category: "IT & Software", location: "Yangon", salaryAmount: 1600, jobType: "Full Time", experience: "Senior Level", workMode: "Hybrid", deadline: "2026-11-01", postedDate: "2026-08-05", status: "Active", featured: true, description: "Lead implementation of core hiring workflows.", responsibilities: "Design modules, mentor juniors, review pull requests.", requirements: "Strong engineering fundamentals.", skills: ["JavaScript", "System Design"], benefits: "Senior allowance, hybrid." }),
    job({ id: "job-011", employerId: "user-e-05", companyName: "GreenLeaf Education", title: "Teacher", category: "Education", location: "Naypyidaw", salaryAmount: 450, jobType: "Full Time", experience: "Mid Level", workMode: "On-site", deadline: "2026-09-28", postedDate: "2026-08-06", status: "Active", featured: false, description: "Teach secondary English in a supportive school.", responsibilities: "Plan lessons, assess students, meet parents.", requirements: "Teaching credential preferred.", skills: ["English", "Lesson Planning"], benefits: "School holidays, housing help." }),
    job({ id: "job-012", employerId: "user-e-02", companyName: "BrightPath Marketing", title: "Customer Service Representative", category: "Customer Service", location: "Yangon", salaryAmount: 400, jobType: "Part Time", experience: "Entry Level", workMode: "On-site", deadline: "2026-09-10", postedDate: "2026-08-16", status: "Active", featured: false, description: "Answer client questions by phone and chat.", responsibilities: "Resolve tickets, log issues, escalate bugs.", requirements: "Clear written English and Burmese.", skills: ["Communication", "Zendesk basics"], benefits: "Shift allowance." }),
    job({ id: "job-013", employerId: "user-e-01", companyName: "Horizon Tech", title: "Project Manager", category: "IT & Software", location: "Yangon", salaryAmount: 1300, jobType: "Full Time", experience: "Senior Level", workMode: "Hybrid", deadline: "2026-10-12", postedDate: "2026-08-04", status: "Active", featured: false, description: "Run delivery for client software projects.", responsibilities: "Plan sprints, manage risk, report to stakeholders.", requirements: "3+ years PM experience.", skills: ["Agile", "Communication"], benefits: "Leadership coaching." }),
    job({ id: "job-014", employerId: "user-e-03", companyName: "Riverbank Finance", title: "Data Analyst", category: "IT & Software", location: "Yangon", salaryAmount: 950, jobType: "Full Time", experience: "Mid Level", workMode: "Hybrid", deadline: "2026-10-08", postedDate: "2026-08-03", status: "Active", featured: true, description: "Turn finance operations data into reports leaders can use.", responsibilities: "Build dashboards, clean data, present findings.", requirements: "SQL and Excel required.", skills: ["SQL", "Excel", "Power BI"], benefits: "Training budget." }),
    job({ id: "job-015", employerId: "user-e-06", companyName: "Apex Engineering", title: "Electrical Engineer", category: "Engineering", location: "Mandalay", salaryAmount: 1200, jobType: "Full Time", experience: "Mid Level", workMode: "On-site", deadline: "2026-10-18", postedDate: "2026-08-02", status: "Active", featured: false, description: "Design and supervise electrical works on commercial sites.", responsibilities: "Produce drawings, inspect sites, coordinate contractors.", requirements: "Engineering degree and site experience.", skills: ["AutoCAD", "Electrical Design"], benefits: "Site allowance, PPE provided." }),
    job({ id: "job-016", employerId: "user-e-04", companyName: "CareFirst Clinic", title: "Healthcare Administrator", category: "Healthcare", location: "Mandalay", salaryAmount: 650, jobType: "Full Time", experience: "Mid Level", workMode: "On-site", deadline: "2026-08-01", postedDate: "2026-07-01", status: "Active", featured: false, description: "Coordinate clinic schedules and patient records.", responsibilities: "Manage appointments, support doctors, keep records accurate.", requirements: "Clinic operations experience.", skills: ["Administration", "Records"], benefits: "Staff clinic access." }),
    job({ id: "job-017", employerId: "user-e-01", companyName: "Horizon Tech", title: "Intern Web Developer", category: "IT & Software", location: "Yangon", salaryAmount: 250, jobType: "Internship", experience: "Entry Level", workMode: "On-site", deadline: "2026-12-01", postedDate: "2026-08-01", status: "Closed", featured: false, description: "Learn production frontend work with a mentor.", responsibilities: "Fix small bugs, write HTML/CSS, attend standups.", requirements: "Basic HTML and CSS.", skills: ["HTML", "CSS"], benefits: "Certificate and possible full-time offer." })
  ];

  var applications = [
    { applicationId: "app-001", jobId: "job-001", jobTitle: "Frontend Developer", company: "Horizon Tech", candidateId: "user-s-01", candidateName: "Aung Min", candidateEmail: "seeker@hirehere.com", phone: "+95 9 400 200 001", resume: "Aung_Min_Resume.pdf", coverLetter: "I would like to join Horizon Tech as a frontend developer.", appliedDate: "2026-08-18", status: "Pending" },
    { applicationId: "app-002", jobId: "job-003", jobTitle: "Full Stack Developer", company: "Horizon Tech", candidateId: "user-s-01", candidateName: "Aung Min", candidateEmail: "seeker@hirehere.com", phone: "+95 9 400 200 001", resume: "Aung_Min_Resume.pdf", coverLetter: "I can contribute across the stack.", appliedDate: "2026-08-19", status: "Shortlisted" },
    { applicationId: "app-003", jobId: "job-002", jobTitle: "Backend Developer", company: "Horizon Tech", candidateId: "user-s-02", candidateName: "Thiri Aye", candidateEmail: "thiri.aye@email.com", phone: "+95 9 400 200 002", resume: "Thiri_Aye_Resume.pdf", coverLetter: "Backend APIs are my focus.", appliedDate: "2026-08-17", status: "Under Review" },
    { applicationId: "app-004", jobId: "job-014", jobTitle: "Data Analyst", company: "Riverbank Finance", candidateId: "user-s-10", candidateName: "Min Khant", candidateEmail: "min.khant@email.com", phone: "+95 9 400 200 010", resume: "Min_Khant_Resume.pdf", coverLetter: "I enjoy turning data into decisions.", appliedDate: "2026-08-16", status: "Interview" }
  ];

  var saved = [
    { userId: "user-s-01", jobId: "job-005" },
    { userId: "user-s-01", jobId: "job-010" }
  ];

  saveUsers(users);
  saveProfiles(profiles);
  saveJobs(jobs);
  saveApplications(applications);
  saveSavedJobs(saved);
}

/* ========== UI chrome ========== */
function showToast(message) {
  var el = document.getElementById("toast");
  if (!el) {
    alert(message);
    return;
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () {
    el.classList.remove("show");
  }, 3200);
}

function fillCategorySelect(selectEl, includeAll) {
  if (!selectEl) return;
  var html = includeAll ? '<option value="">All categories</option>' : "";
  CATEGORIES.forEach(function (c) {
    html += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + "</option>";
  });
  selectEl.innerHTML = html;
}

function renderFooter() {
  var el = document.getElementById("site-footer");
  if (!el) return;
  el.innerHTML =
    '<div class="container"><div class="footer-grid">' +
    "<div><strong>HireHere.com</strong><p>Find Jobs. Find Talent. Build Your Future.</p></div>" +
    '<div><h3>Job seekers</h3><a href="jobs.html">Find Jobs</a><br><a href="register.html">Register</a></div>' +
    '<div><h3>Employers</h3><a href="post-job.html">Post a Job</a><br><a href="candidates.html">Find Candidates</a></div>' +
    '<div><h3>Company</h3><a href="index.html#about">About</a><br><a href="login.html">Login</a></div>' +
    '</div><p class="footer-bottom">HireHere.com frontend prototype. Data is stored in this browser only.</p></div>';
}

function navLink(href, label) {
  var page = (href.split("?")[0] || "").replace("./", "");
  var current = (window.location.pathname.split("/").pop() || "index.html");
  if (!current || current === "") current = "index.html";
  var active = current === page ? ' aria-current="page"' : "";
  return '<a href="' + href + '"' + active + ">" + label + "</a>";
}

function renderNav() {
  var nav = document.getElementById("main-nav");
  if (!nav) return;
  var user = getCurrentUser();
  var html = "";
  if (!user) {
    html += navLink("index.html", "Home");
    html += navLink("jobs.html", "Find Jobs");
    html += navLink("candidates.html", "Find Candidates");
    html += navLink("post-job.html", "Post a Job");
    html += '<a href="index.html#about">About</a>';
    html += navLink("login.html", "Login");
    html += '<a class="btn" href="register.html">Register</a>';
  } else if (user.role === "seeker") {
    html += navLink("index.html", "Home");
    html += navLink("jobs.html", "Find Jobs");
    html += navLink("saved-jobs.html", "Saved Jobs");
    html += navLink("applications.html", "Applications");
    html += navLink("dashboard.html", "Dashboard");
    html += navLink("profile.html", "Profile");
    html += '<button type="button" class="link-btn" data-logout>Logout</button>';
  } else {
    html += navLink("index.html", "Home");
    html += navLink("candidates.html", "Find Candidates");
    html += navLink("post-job.html", "Post a Job");
    html += navLink("employer-dashboard.html", "My Jobs");
    html += navLink("applications.html", "Applications");
    html += navLink("employer-dashboard.html", "Dashboard");
    html += navLink("profile.html", "Profile");
    html += '<button type="button" class="link-btn" data-logout>Logout</button>';
  }
  nav.innerHTML = html;
  var logoutBtn = nav.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      logoutUser();
      showToast("You have been logged out.");
      window.location.href = "index.html";
    });
  }
}

function setupHamburger() {
  var btn = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (!btn || !nav) return;
  btn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function requireUser(role) {
  var user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html?next=" + encodeURIComponent(window.location.pathname.split("/").pop() + window.location.search);
    return null;
  }
  if (role && user.role !== role) {
    window.location.href = user.role === "employer" ? "employer-dashboard.html" : "dashboard.html";
    return null;
  }
  return user;
}

/* ========== Shared job / candidate cards ========== */
function jobCardHtml(job, options) {
  options = options || {};
  var user = getCurrentUser();
  var saved = user && user.role === "seeker" && isSaved(user.id, job.id);
  var status = effectiveJobStatus(job);
  var saveLabel = saved ? "Saved" : "Save Job";
  var extra = "";
  if (options.employer) {
    extra =
      '<div class="actions">' +
      '<a class="btn btn-secondary" href="job-details.html?id=' + job.id + '">View</a>' +
      '<a class="btn btn-secondary" href="post-job.html?id=' + job.id + '">Edit</a>' +
      '<a class="btn btn-ghost" href="applications.html?jobId=' + job.id + '">Manage Applications</a>' +
      (status === "Active" ? '<button type="button" class="btn btn-secondary" data-close-job="' + job.id + '">Close</button>' : "") +
      '<button type="button" class="btn btn-danger" data-delete-job="' + job.id + '">Delete</button>' +
      "</div>" +
      '<p class="meta">Applications: ' + applicationCount(job.id) + ' · Status: <span class="' + statusBadgeClass(status) + '">' + status + "</span></p>";
  } else {
    extra =
      '<div class="actions">' +
      '<a class="btn" href="job-details.html?id=' + job.id + '">View Job</a>' +
      '<button type="button" class="btn btn-secondary" data-save-job="' + job.id + '">' + saveLabel + "</button>" +
      (options.remove ? '<button type="button" class="btn btn-danger" data-unsave-job="' + job.id + '">Remove Saved Job</button>' : "") +
      "</div>";
  }
  return (
    '<article class="job-card card">' +
    "<h3>" + escapeHtml(job.title) + "</h3>" +
    '<p class="meta">' + escapeHtml(job.companyName) + " · " + escapeHtml(job.location) + "</p>" +
    '<div class="chip-row">' +
    '<span class="chip">' + escapeHtml(salaryLabel(job.salaryAmount)) + "</span>" +
    '<span class="chip">' + escapeHtml(job.jobType) + "</span>" +
    '<span class="chip">' + escapeHtml(job.experience) + "</span>" +
    '<span class="chip">' + escapeHtml(job.workMode) + "</span>" +
    "</div>" +
    '<p class="meta">Posted ' + escapeHtml(formatDate(job.postedDate)) + "</p>" +
    extra +
    "</article>"
  );
}

function bindSaveButtons(root) {
  (root || document).querySelectorAll("[data-save-job]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var user = getCurrentUser();
      if (!user) {
        showToast("You must be logged in to save jobs.");
        window.location.href = "login.html?next=jobs.html";
        return;
      }
      if (user.role !== "seeker") {
        showToast("Only job seekers can save jobs.");
        return;
      }
      var id = btn.getAttribute("data-save-job");
      var nowSaved = toggleSave(user.id, id);
      btn.textContent = nowSaved ? "Saved" : "Save Job";
      showToast(nowSaved ? "Job saved." : "Job removed from saved list.");
    });
  });
}

function candidateCardHtml(user, profile) {
  profile = profile || {};
  var skills = (profile.skills || []).slice(0, 4).map(function (s) {
    return '<span class="chip">' + escapeHtml(s) + "</span>";
  }).join("");
  return (
    '<article class="candidate-card card">' +
    '<div class="profile-head"><div class="avatar" aria-hidden="true">' + escapeHtml(initials(user.fullName)) + "</div><div>" +
    "<h3>" + escapeHtml(user.fullName) + "</h3>" +
    '<p class="meta">' + escapeHtml(profile.professionalTitle || "Job seeker") + " · " + escapeHtml(user.location || "") + "</p>" +
    "</div></div>" +
    '<div class="chip-row">' + skills + "</div>" +
    '<p class="meta">' + escapeHtml(profile.experienceLevel || "") + "</p>" +
    "<p>" + escapeHtml(profile.about || "") + "</p>" +
    '<a class="btn" href="candidate-details.html?id=' + user.id + '">View Profile</a>' +
    "</article>"
  );
}

function filterJobs(jobs, filters) {
  filters = filters || {};
  var q = (filters.q || "").trim().toLowerCase();
  var loc = (filters.location || "").trim().toLowerCase();
  var cat = filters.category || "";
  var types = filters.jobTypes || [];
  var exps = filters.experiences || [];
  var modes = filters.workModes || [];
  var salary = filters.salary || "";

  return jobs.filter(function (job) {
    var hay = (job.title + " " + job.companyName + " " + job.description + " " + (job.skills || []).join(" ")).toLowerCase();
    if (q && hay.indexOf(q) === -1) return false;
    if (loc && String(job.location).toLowerCase().indexOf(loc) === -1) return false;
    if (cat && job.category !== cat) return false;
    if (types.length && types.indexOf(job.jobType) === -1) return false;
    if (exps.length && exps.indexOf(job.experience) === -1) return false;
    if (modes.length && modes.indexOf(job.workMode) === -1) return false;
    if (!matchesSalaryFilter(job.salaryAmount, salary)) return false;
    return true;
  });
}

function checkedValues(name) {
  return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]:checked')).map(function (el) {
    return el.value;
  });
}

/* ========== Pages ========== */
function initHome() {
  fillCategorySelect(document.getElementById("home-category"), true);
  var cats = document.getElementById("category-list");
  if (cats) {
    cats.innerHTML = CATEGORIES.map(function (c) {
      return '<a class="cat-card" href="jobs.html?category=' + encodeURIComponent(c) + '">' + escapeHtml(c) + "</a>";
    }).join("");
  }
  var featured = getJobs().filter(function (j) { return j.featured; }).slice(0, 6);
  var box = document.getElementById("featured-jobs");
  if (box) {
    box.innerHTML = featured.map(function (j) { return jobCardHtml(j); }).join("");
    bindSaveButtons(box);
  }
  var form = document.getElementById("home-job-search");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = document.getElementById("home-keyword").value;
      var location = document.getElementById("home-location").value;
      var category = document.getElementById("home-category").value;
      var params = new URLSearchParams();
      if (q) params.set("q", q);
      if (location) params.set("location", location);
      if (category) params.set("category", category);
      window.location.href = "jobs.html?" + params.toString();
    });
  }
}

function initJobs() {
  fillCategorySelect(document.getElementById("job-category"), true);
  document.getElementById("job-keyword").value = getQuery("q");
  document.getElementById("job-location").value = getQuery("location");
  var cat = getQuery("category");
  if (cat) document.getElementById("job-category").value = cat;

  function render() {
    var filters = {
      q: document.getElementById("job-keyword").value,
      location: document.getElementById("job-location").value,
      category: document.getElementById("job-category").value,
      jobTypes: checkedValues("jobType"),
      experiences: checkedValues("experience"),
      workModes: checkedValues("workMode"),
      salary: (document.querySelector('input[name="salary"]:checked') || {}).value || ""
    };
    var results = filterJobs(getJobs(), filters);
    var count = document.getElementById("jobs-count");
    var list = document.getElementById("jobs-results");
    count.textContent = results.length + (results.length === 1 ? " Job Found" : " Jobs Found");
    if (!results.length) {
      list.innerHTML = '<p class="empty">No jobs found. Try changing your search filters.</p>';
      return;
    }
    list.innerHTML = results.map(function (j) { return jobCardHtml(j); }).join("");
    bindSaveButtons(list);
  }

  document.getElementById("jobs-search").addEventListener("submit", function (e) {
    e.preventDefault();
    render();
  });
  document.querySelectorAll(".filters input").forEach(function (el) {
    el.addEventListener("change", render);
  });
  document.getElementById("job-keyword").addEventListener("input", render);
  document.getElementById("job-location").addEventListener("input", render);
  document.getElementById("job-category").addEventListener("change", render);
  document.getElementById("clear-filters").addEventListener("click", function () {
    document.getElementById("jobs-search").reset();
    document.querySelectorAll('.filters input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    var any = document.querySelector('input[name="salary"][value=""]');
    if (any) any.checked = true;
    render();
  });
  render();
}

function paintJobDetails() {
  var id = getQuery("id");
  var job = getJobById(id);
  var root = document.getElementById("job-details-root");
  if (!job) {
    root.innerHTML = '<p class="empty">This job could not be found.</p>';
    return null;
  }
  var user = getCurrentUser();
  var status = effectiveJobStatus(job);
  var applied = user && hasApplied(user.id, job.id);
  var applyBtn;
  if (!canApplyToJob(job)) {
    applyBtn = '<button class="btn" type="button" disabled>Applications Closed</button>';
  } else if (applied) {
    applyBtn = '<button class="btn" type="button" disabled>Application Submitted</button>';
  } else {
    applyBtn = '<button class="btn" type="button" id="open-apply">Apply Now</button>';
  }
  var saved = user && user.role === "seeker" && isSaved(user.id, job.id);
  root.innerHTML =
    '<article class="job-hero card"><div class="logo-ph lg" aria-hidden="true">' + escapeHtml(initials(job.companyName)) + "</div><div>" +
    "<h1>" + escapeHtml(job.title) + "</h1>" +
    "<p>" + escapeHtml(job.companyName) + "</p>" +
    '<p class="meta">' + escapeHtml(job.location) + " · " + escapeHtml(salaryLabel(job.salaryAmount)) + " · " + escapeHtml(job.jobType) + " · " + escapeHtml(job.experience) + " · " + escapeHtml(job.workMode) + "</p>" +
    '<p class="meta">Posted ' + escapeHtml(formatDate(job.postedDate)) + (job.deadline ? " · Apply by " + escapeHtml(formatDate(job.deadline)) : "") + ' · <span class="' + statusBadgeClass(status) + '">' + status + "</span></p>" +
    '<div class="actions">' + applyBtn +
    '<button type="button" class="btn btn-secondary" data-save-job="' + job.id + '">' + (saved ? "Saved" : "Save Job") + "</button>" +
    "</div></div></article>" +
    '<div class="detail-grid"><div>' +
    '<section class="panel"><h2>Job Description</h2><p>' + escapeHtml(job.description) + "</p></section>" +
    '<section class="panel" style="margin-top:1rem;"><h2>Responsibilities</h2><p>' + escapeHtml(job.responsibilities) + "</p></section>" +
    '<section class="panel" style="margin-top:1rem;"><h2>Requirements</h2><p>' + escapeHtml(job.requirements) + "</p></section>" +
    "</div><aside>" +
    '<section class="panel"><h2>Skills</h2><div class="skill-list">' + (job.skills || []).map(function (s) { return '<span class="chip">' + escapeHtml(s) + "</span>"; }).join("") + "</div></section>" +
    '<section class="panel" style="margin-top:1rem;"><h2>Benefits</h2><p>' + escapeHtml(job.benefits) + "</p></section>" +
    "</aside></div>";

  bindSaveButtons(root);
  var open = document.getElementById("open-apply");
  var modal = document.getElementById("apply-modal");
  if (open) {
    open.addEventListener("click", function () {
      var u = getCurrentUser();
      if (!u) {
        showToast("You must be logged in to apply.");
        window.location.href = "login.html?next=" + encodeURIComponent("job-details.html?id=" + job.id);
        return;
      }
      if (u.role !== "seeker") {
        showToast("Employers cannot apply for jobs. Register as a job seeker.");
        return;
      }
      if (!canApplyToJob(job)) {
        showToast("This job is no longer accepting applications.");
        return;
      }
      if (hasApplied(u.id, job.id)) {
        showToast("You have already applied for this job.");
        return;
      }
      document.getElementById("apply-name").value = u.fullName || "";
      document.getElementById("apply-email").value = u.email || "";
      document.getElementById("apply-phone").value = u.phone || "";
      modal.classList.remove("hidden");
    });
  }
  return job;
}

function initJobDetails() {
  var job = paintJobDetails();
  if (!job) return;
  var modal = document.getElementById("apply-modal");
  var form = document.getElementById("apply-form");
  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";
  document.getElementById("apply-cancel").addEventListener("click", function () {
    modal.classList.add("hidden");
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.classList.add("hidden");
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var currentJob = getJobById(getQuery("id"));
    var u = getCurrentUser();
    if (!u || u.role !== "seeker") return;
    var name = document.getElementById("apply-name").value.trim();
    var email = document.getElementById("apply-email").value.trim();
    var phone = document.getElementById("apply-phone").value.trim();
    var cover = document.getElementById("apply-cover").value.trim();
    if (!name || !email || !phone || !cover) {
      showToast("Please fill in all required fields.");
      return;
    }
    if (!isValidEmail(email)) {
      showToast("Please enter a valid email.");
      return;
    }
    if (!canApplyToJob(currentJob)) {
      showToast("This job is no longer accepting applications.");
      return;
    }
    if (hasApplied(u.id, currentJob.id)) {
      showToast("You have already applied for this job.");
      return;
    }
    var apps = getApplications();
    apps.push({
      applicationId: makeId("app"),
      jobId: currentJob.id,
      jobTitle: currentJob.title,
      company: currentJob.companyName,
      candidateId: u.id,
      candidateName: name,
      candidateEmail: email,
      phone: phone,
      resume: document.getElementById("apply-resume").value,
      coverLetter: cover,
      appliedDate: todayIso(),
      status: "Pending"
    });
    saveApplications(apps);
    modal.classList.add("hidden");
    showToast("Application submitted successfully.");
    paintJobDetails();
  });
}

function initLogin() {
  var user = getCurrentUser();
  if (user) {
    window.location.href = user.role === "employer" ? "employer-dashboard.html" : "dashboard.html";
    return;
  }
  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("login-email").value.trim().toLowerCase();
    var password = document.getElementById("login-password").value;
    var found = getUsers().filter(function (u) {
      return u.email.toLowerCase() === email && u.password === password;
    })[0];
    var alertBox = document.getElementById("login-alert");
    if (!found) {
      alertBox.innerHTML = '<div class="alert alert-error">Invalid email or password.</div>';
      return;
    }
    saveCurrentUser(found);
    showToast("Login successful.");
    var next = getQuery("next");
    if (next && next.indexOf("http") !== 0) {
      window.location.href = next;
      return;
    }
    window.location.href = found.role === "employer" ? "employer-dashboard.html" : "dashboard.html";
  });
}

function initRegister() {
  var seekerBox = document.getElementById("seeker-fields");
  var empBox = document.getElementById("employer-fields");
  document.querySelectorAll('input[name="role"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var isSeeker = document.querySelector('input[name="role"]:checked').value === "seeker";
      seekerBox.classList.toggle("hidden", !isSeeker);
      empBox.classList.toggle("hidden", isSeeker);
    });
  });
  document.getElementById("register-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var role = document.querySelector('input[name="role"]:checked').value;
    var password = document.getElementById("reg-password").value;
    var confirm = document.getElementById("reg-confirm").value;
    var alertBox = document.getElementById("register-alert");
    function fail(msg) {
      alertBox.innerHTML = '<div class="alert alert-error">' + escapeHtml(msg) + "</div>";
    }
    var fullName, email, phone, location, companyName;
    if (role === "seeker") {
      fullName = document.getElementById("reg-name").value.trim();
      email = document.getElementById("reg-email").value.trim();
      phone = document.getElementById("reg-phone").value.trim();
      location = document.getElementById("reg-location").value.trim();
      if (!fullName || !email || !phone || !location || !password || !confirm) {
        fail("Please fill in all required fields.");
        return;
      }
    } else {
      fullName = document.getElementById("reg-emp-name").value.trim();
      companyName = document.getElementById("reg-company").value.trim();
      email = document.getElementById("reg-company-email").value.trim();
      phone = document.getElementById("reg-emp-phone").value.trim();
      location = document.getElementById("reg-company-location").value.trim();
      if (!fullName || !companyName || !email || !phone || !location || !password || !confirm) {
        fail("Please fill in all required fields.");
        return;
      }
    }
    if (!isValidEmail(email)) {
      fail("Please enter a valid email.");
      return;
    }
    if (password.length < 6) {
      fail("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      fail("Passwords do not match.");
      return;
    }
    var users = getUsers();
    if (users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
      fail("An account with this email already exists.");
      return;
    }
    var user = {
      id: makeId("user"),
      role: role,
      fullName: fullName,
      email: email,
      phone: phone,
      password: password,
      location: location,
      companyName: companyName || ""
    };
    users.push(user);
    saveUsers(users);
    upsertProfile({
      userId: user.id,
      professionalTitle: role === "seeker" ? "" : "",
      about: "",
      skills: [],
      education: "",
      experienceText: "",
      experienceLevel: "Entry Level",
      category: "",
      resume: "Resume.pdf",
      companyDescription: "",
      website: "",
      aboutCompany: ""
    });
    saveCurrentUser(user);
    showToast("Account created. Welcome to HireHere.com.");
    window.location.href = role === "employer" ? "employer-dashboard.html" : "dashboard.html";
  });
}

function applicationRow(app, forEmployer) {
  var badge = '<span class="' + statusBadgeClass(app.status) + '">' + escapeHtml(app.status) + "</span>";
  var actions = '<button type="button" class="btn btn-secondary" data-view-app="' + app.applicationId + '">View</button>';
  if (forEmployer) {
    actions +=
      ' <a class="btn btn-ghost" href="candidate-details.html?id=' + app.candidateId + '">View Candidate</a>' +
      ' <button type="button" class="btn btn-secondary" data-status="Shortlisted" data-app="' + app.applicationId + '">Shortlist</button>' +
      ' <button type="button" class="btn btn-secondary" data-status="Interview" data-app="' + app.applicationId + '">Interview</button>' +
      ' <button type="button" class="btn btn-secondary" data-status="Under Review" data-app="' + app.applicationId + '">Under Review</button>' +
      ' <button type="button" class="btn btn-secondary" data-status="Accepted" data-app="' + app.applicationId + '">Accept</button>' +
      ' <button type="button" class="btn btn-danger" data-status="Rejected" data-app="' + app.applicationId + '">Reject</button>' +
      ' <button type="button" class="btn" data-status="Hired" data-app="' + app.applicationId + '">Hire</button>';
  }
  return (
    '<article class="app-card card">' +
    "<h3>" + escapeHtml(forEmployer ? app.candidateName : app.jobTitle) + "</h3>" +
    '<p class="meta">' + escapeHtml(forEmployer ? app.candidateEmail + " · " + (app.phone || "") : app.company) + "</p>" +
    '<p class="meta">Applied ' + escapeHtml(formatDate(app.appliedDate)) + " · " + badge + "</p>" +
    (forEmployer ? "<p>Resume: " + escapeHtml(app.resume || "Not provided") + "</p>" : "") +
    '<div class="actions">' + actions + "</div></article>"
  );
}

function timelineHtml(status) {
  var steps = ["Applied", "Under Review", "Shortlisted", "Interview", "Decision"];
  var order = { Pending: 0, "Under Review": 1, Shortlisted: 2, Interview: 3, Accepted: 4, Rejected: 4, Hired: 4 };
  var idx = order[status] == null ? 0 : order[status];
  var html = '<ol class="timeline">';
  steps.forEach(function (step, i) {
    var label = step;
    if (step === "Decision" && (status === "Accepted" || status === "Rejected" || status === "Hired")) {
      label = status;
    } else if (step === "Applied") {
      label = "Applied";
    }
    var cls = i < idx ? "done" : i === idx ? "current" : "";
    html += '<li class="' + cls + '">' + escapeHtml(label) + "</li>";
  });
  html += "</ol>";
  return html;
}

function setApplicationStatus(id, status) {
  var apps = getApplications();
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].applicationId === id) {
      apps[i].status = status;
    }
  }
  saveApplications(apps);
}

function findApp(id) {
  return getApplications().filter(function (a) { return a.applicationId === id; })[0];
}

function openAppDetail(app, forEmployer) {
  var modal = document.getElementById("app-detail-modal");
  var body = document.getElementById("app-detail-body");
  if (!modal || !body || !app) return;
  body.innerHTML =
    "<p><strong>Job:</strong> " + escapeHtml(app.jobTitle) + " at " + escapeHtml(app.company) + "</p>" +
    "<p><strong>Candidate:</strong> " + escapeHtml(app.candidateName) + " (" + escapeHtml(app.candidateEmail) + ")</p>" +
    "<p><strong>Phone:</strong> " + escapeHtml(app.phone || "") + "</p>" +
    "<p><strong>Applied:</strong> " + escapeHtml(formatDate(app.appliedDate)) + "</p>" +
    "<p><strong>Status:</strong> <span class='" + statusBadgeClass(app.status) + "'>" + escapeHtml(app.status) + "</span></p>" +
    "<p><strong>Resume:</strong> " + escapeHtml(app.resume || "") + "</p>" +
    "<p><strong>Cover letter:</strong> " + escapeHtml(app.coverLetter || "") + "</p>" +
    (forEmployer ? "" : "<h3>Progress</h3>" + timelineHtml(app.status));
  modal.classList.remove("hidden");
}

function initApplications() {
  var user = requireUser();
  if (!user) return;
  var root = document.getElementById("apps-root");
  var title = document.getElementById("apps-title");
  var sub = document.getElementById("apps-subtitle");
  var jobFilter = getQuery("jobId");
  var apps;
  var forEmployer = user.role === "employer";

  if (forEmployer) {
    title.textContent = "Manage applications";
    sub.textContent = "Update status so job seekers see the latest decision.";
    var myJobIds = getJobs().filter(function (j) { return j.employerId === user.id; }).map(function (j) { return j.id; });
    apps = getApplications().filter(function (a) {
      return myJobIds.indexOf(a.jobId) !== -1 && (!jobFilter || a.jobId === jobFilter);
    });
    if (!apps.length) {
      root.innerHTML = '<p class="empty">You don\'t have any new applications.</p>';
    } else {
      root.innerHTML = apps.map(function (a) { return applicationRow(a, true); }).join("");
    }
  } else {
    title.textContent = "My applications";
    sub.textContent = "See whether each application is pending, accepted, rejected, or hired.";
    apps = getApplications().filter(function (a) { return a.candidateId === user.id; });
    if (!apps.length) {
      root.innerHTML = '<p class="empty">You haven\'t applied for any jobs yet.</p>';
    } else {
      var table =
        '<div class="table-wrap desktop-table"><table class="data"><thead><tr><th>Job</th><th>Company</th><th>Applied Date</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
        apps.map(function (a) {
          return "<tr><td>" + escapeHtml(a.jobTitle) + "</td><td>" + escapeHtml(a.company) + "</td><td>" + escapeHtml(formatDate(a.appliedDate)) + "</td><td><span class='" + statusBadgeClass(a.status) + "'>" + escapeHtml(a.status) + "</span></td><td><button type='button' class='btn btn-secondary' data-view-app='" + a.applicationId + "'>View</button></td></tr>";
        }).join("") +
        "</tbody></table></div>";
      var cards = '<div class="mobile-cards">' + apps.map(function (a) { return applicationRow(a, false); }).join("") + "</div>";
      root.innerHTML = table + cards;
    }
  }

  root.querySelectorAll("[data-view-app]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openAppDetail(findApp(btn.getAttribute("data-view-app")), forEmployer);
    });
  });
  root.querySelectorAll("[data-status]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setApplicationStatus(btn.getAttribute("data-app"), btn.getAttribute("data-status"));
      showToast("Application status updated to " + btn.getAttribute("data-status") + ".");
      initApplications();
    });
  });
  var close = document.getElementById("app-detail-close");
  var modal = document.getElementById("app-detail-modal");
  if (close) close.addEventListener("click", function () { modal.classList.add("hidden"); });
  if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) modal.classList.add("hidden"); });
}

function initDashboard() {
  var user = requireUser("seeker");
  if (!user) return;
  document.getElementById("dash-welcome").textContent = "Welcome, " + user.fullName;
  var apps = getApplications().filter(function (a) { return a.candidateId === user.id; });
  var saved = getSavedJobs().filter(function (s) { return s.userId === user.id; });
  function countStatus(s) {
    return apps.filter(function (a) { return a.status === s; }).length;
  }
  document.getElementById("seeker-stats").innerHTML =
    statHtml("Saved Jobs", saved.length) +
    statHtml("Applied Jobs", apps.length) +
    statHtml("Pending Applications", countStatus("Pending")) +
    statHtml("Accepted Applications", countStatus("Accepted")) +
    statHtml("Rejected Applications", countStatus("Rejected"));
  var recent = apps.slice().sort(function (a, b) { return a.appliedDate < b.appliedDate ? 1 : -1; }).slice(0, 5);
  var box = document.getElementById("recent-apps");
  if (!recent.length) {
    box.innerHTML = '<p class="empty">You haven\'t applied for any jobs yet.</p>';
  } else {
    box.innerHTML = recent.map(function (a) {
      return '<article class="app-card card"><h3>' + escapeHtml(a.jobTitle) + "</h3><p class='meta'>" + escapeHtml(a.company) + " · " + escapeHtml(formatDate(a.appliedDate)) + '</p><span class="' + statusBadgeClass(a.status) + '">' + escapeHtml(a.status) + "</span></article>";
    }).join("");
  }
}

function statHtml(label, n) {
  return '<div class="stat"><strong>' + n + "</strong><span>" + escapeHtml(label) + "</span></div>";
}

function initSavedJobs() {
  var user = requireUser("seeker");
  if (!user) return;
  var list = document.getElementById("saved-jobs-list");
  var ids = getSavedJobs().filter(function (s) { return s.userId === user.id; }).map(function (s) { return s.jobId; });
  var jobs = getJobs().filter(function (j) { return ids.indexOf(j.id) !== -1; });
  if (!jobs.length) {
    list.innerHTML = '<p class="empty">No saved jobs yet.</p>';
    return;
  }
  list.innerHTML = jobs.map(function (j) { return jobCardHtml(j, { remove: true }); }).join("");
  bindSaveButtons(list);
  list.querySelectorAll("[data-unsave-job]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      toggleSave(user.id, btn.getAttribute("data-unsave-job"));
      showToast("Job removed from saved list.");
      initSavedJobs();
    });
  });
}

function initProfile() {
  var user = requireUser();
  if (!user) return;
  var profile = getProfile(user.id) || { userId: user.id, skills: [] };
  var form = document.getElementById("profile-form");
  if (user.role === "seeker") {
    form.innerHTML =
      '<div class="profile-head"><div class="avatar lg" aria-hidden="true">' + escapeHtml(initials(user.fullName)) + '</div><p class="muted">Profile photo placeholder</p></div>' +
      field("Full Name", "fullName", user.fullName) +
      field("Professional Title", "professionalTitle", profile.professionalTitle || "") +
      field("Email", "email", user.email, "email") +
      field("Phone", "phone", user.phone) +
      field("Location", "location", user.location) +
      area("About", "about", profile.about || "") +
      field("Skills (comma separated)", "skills", (profile.skills || []).join(", ")) +
      area("Education", "education", profile.education || "") +
      area("Experience", "experienceText", profile.experienceText || "") +
      field("Experience level", "experienceLevel", profile.experienceLevel || "Entry Level") +
      field("Job category", "category", profile.category || "") +
      field("Resume filename (placeholder)", "resume", profile.resume || "Resume.pdf") +
      '<button class="btn" type="submit" style="margin-top:1rem;">Save profile</button>';
  } else {
    form.innerHTML =
      '<div class="profile-head"><div class="logo-ph lg" aria-hidden="true">' + escapeHtml(initials(user.companyName || user.fullName)) + '</div><p class="muted">Company logo placeholder</p></div>' +
      field("Full Name", "fullName", user.fullName) +
      field("Company Name", "companyName", user.companyName || "") +
      area("Company Description", "companyDescription", profile.companyDescription || "") +
      field("Company Email", "email", user.email, "email") +
      field("Phone", "phone", user.phone) +
      field("Location", "location", user.location) +
      field("Website", "website", profile.website || "") +
      area("About Company", "about", profile.about || "") +
      '<button class="btn" type="submit" style="margin-top:1rem;">Save profile</button>';
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var email = String(data.get("email") || "").trim();
    if (!email || !String(data.get("fullName") || "").trim()) {
      document.getElementById("profile-alert").innerHTML = '<div class="alert alert-error">Please fill in all required fields.</div>';
      return;
    }
    if (!isValidEmail(email)) {
      document.getElementById("profile-alert").innerHTML = '<div class="alert alert-error">Please enter a valid email.</div>';
      return;
    }
    var users = getUsers();
    users.forEach(function (u) {
      if (u.id === user.id) {
        u.fullName = String(data.get("fullName"));
        u.email = email;
        u.phone = String(data.get("phone") || "");
        u.location = String(data.get("location") || "");
        if (user.role === "employer") u.companyName = String(data.get("companyName") || "");
      }
    });
    saveUsers(users);
    var updated = users.filter(function (u) { return u.id === user.id; })[0];
    saveCurrentUser(updated);
    if (user.role === "seeker") {
      upsertProfile({
        userId: user.id,
        professionalTitle: String(data.get("professionalTitle") || ""),
        about: String(data.get("about") || ""),
        skills: String(data.get("skills") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
        education: String(data.get("education") || ""),
        experienceText: String(data.get("experienceText") || ""),
        experienceLevel: String(data.get("experienceLevel") || ""),
        category: String(data.get("category") || ""),
        resume: String(data.get("resume") || "Resume.pdf")
      });
    } else {
      upsertProfile({
        userId: user.id,
        companyDescription: String(data.get("companyDescription") || ""),
        website: String(data.get("website") || ""),
        about: String(data.get("about") || "")
      });
    }
    showToast("Profile updated successfully.");
    document.getElementById("profile-alert").innerHTML = '<div class="alert alert-success">Profile updated successfully.</div>';
  });
}

function field(label, name, value, type) {
  return '<div class="field" style="margin-top:0.7rem;"><label for="pf-' + name + '">' + escapeHtml(label) + '</label><input id="pf-' + name + '" name="' + name + '" type="' + (type || "text") + '" value="' + escapeHtml(value) + '"></div>';
}
function area(label, name, value) {
  return '<div class="field" style="margin-top:0.7rem;"><label for="pf-' + name + '">' + escapeHtml(label) + '</label><textarea id="pf-' + name + '" name="' + name + '">' + escapeHtml(value) + "</textarea></div>";
}

function initEmployerDashboard() {
  var user = requireUser("employer");
  if (!user) return;
  document.getElementById("emp-welcome").textContent = "Welcome, " + (user.companyName || user.fullName);
  var jobs = getJobs().filter(function (j) { return j.employerId === user.id; });
  var apps = getApplications().filter(function (a) {
    return jobs.some(function (j) { return j.id === a.jobId; });
  });
  var newApps = apps.filter(function (a) { return a.status === "Pending"; });
  var hired = apps.filter(function (a) { return a.status === "Hired"; });
  var active = jobs.filter(function (j) { return effectiveJobStatus(j) === "Active"; });
  document.getElementById("employer-stats").innerHTML =
    statHtml("Total Jobs", jobs.length) +
    statHtml("Active Jobs", active.length) +
    statHtml("Total Applications", apps.length) +
    statHtml("New Applications", newApps.length) +
    statHtml("Hired Candidates", hired.length);
  var box = document.getElementById("my-jobs");
  if (!jobs.length) {
    box.innerHTML = '<p class="empty">You haven\'t posted any jobs yet.</p>';
    return;
  }
  box.innerHTML = jobs.map(function (j) { return jobCardHtml(j, { employer: true }); }).join("");
  box.querySelectorAll("[data-delete-job]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!confirm("Delete this job posting?")) return;
      var id = btn.getAttribute("data-delete-job");
      saveJobs(getJobs().filter(function (j) { return j.id !== id; }));
      showToast("Job deleted.");
      initEmployerDashboard();
    });
  });
  box.querySelectorAll("[data-close-job]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-close-job");
      var all = getJobs();
      all.forEach(function (j) { if (j.id === id) j.status = "Closed"; });
      saveJobs(all);
      showToast("Job closed. Candidates can no longer apply.");
      initEmployerDashboard();
    });
  });
}

function initPostJob() {
  var user = getCurrentUser();
  if (!user) {
    showToast("You must be logged in as an employer to post a job.");
    window.location.href = "login.html?next=post-job.html";
    return;
  }
  if (user.role !== "employer") {
    showToast("Only employers can post jobs.");
    window.location.href = "dashboard.html";
    return;
  }
  fillCategorySelect(document.getElementById("pj-category"), false);
  var editId = getQuery("id");
  var form = document.getElementById("post-job-form");
  if (editId) {
    var existing = getJobById(editId);
    if (!existing || existing.employerId !== user.id) {
      document.getElementById("post-job-alert").innerHTML = '<div class="alert alert-error">You can only edit your own jobs.</div>';
      return;
    }
    document.getElementById("post-job-title").textContent = "Edit job";
    document.getElementById("pj-submit").textContent = "Save changes";
    form.companyName.value = existing.companyName;
    form.title.value = existing.title;
    form.category.value = existing.category;
    form.location.value = existing.location;
    form.salaryAmount.value = existing.salaryAmount;
    form.jobType.value = existing.jobType;
    form.experience.value = existing.experience;
    form.workMode.value = existing.workMode;
    form.deadline.value = existing.deadline;
    form.description.value = existing.description;
    form.responsibilities.value = existing.responsibilities;
    form.requirements.value = existing.requirements;
    form.skills.value = (existing.skills || []).join(", ");
    form.benefits.value = existing.benefits;
  } else {
    form.companyName.value = user.companyName || "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var required = ["companyName", "title", "category", "location", "salaryAmount", "jobType", "experience", "workMode", "deadline", "description", "responsibilities", "requirements", "skills", "benefits"];
    for (var i = 0; i < required.length; i++) {
      if (!String(data.get(required[i]) || "").trim()) {
        document.getElementById("post-job-alert").innerHTML = '<div class="alert alert-error">Please fill in all required fields.</div>';
        showToast("Please fill in all required fields.");
        return;
      }
    }
    var payload = {
      employerId: user.id,
      companyName: String(data.get("companyName")).trim(),
      title: String(data.get("title")).trim(),
      category: String(data.get("category")),
      location: String(data.get("location")).trim(),
      salaryAmount: Number(data.get("salaryAmount")),
      jobType: String(data.get("jobType")),
      experience: String(data.get("experience")),
      workMode: String(data.get("workMode")),
      deadline: String(data.get("deadline")),
      description: String(data.get("description")).trim(),
      responsibilities: String(data.get("responsibilities")).trim(),
      requirements: String(data.get("requirements")).trim(),
      skills: String(data.get("skills")).split(",").map(function (s) { return s.trim(); }).filter(Boolean),
      benefits: String(data.get("benefits")).trim(),
      status: "Active",
      featured: false
    };
    var jobs = getJobs();
    if (editId) {
      jobs.forEach(function (j) {
        if (j.id === editId) {
          Object.assign(j, payload);
        }
      });
      saveJobs(jobs);
      showToast("Job updated successfully.");
    } else {
      payload.id = makeId("job");
      payload.postedDate = todayIso();
      jobs.push(payload);
      saveJobs(jobs);
      showToast("Job posted successfully.");
    }
    window.location.href = "employer-dashboard.html";
  });
}

function initCandidates() {
  fillCategorySelect(document.getElementById("c-category"), true);
  function seekers() {
    return getUsers().filter(function (u) { return u.role === "seeker"; });
  }
  function render() {
    var name = (document.getElementById("c-name").value || "").trim().toLowerCase();
    var skill = (document.getElementById("c-skill").value || "").trim().toLowerCase();
    var category = document.getElementById("c-category").value;
    var exp = document.getElementById("c-exp").value;
    var location = (document.getElementById("c-location").value || "").trim().toLowerCase();
    var results = seekers().filter(function (u) {
      var p = getProfile(u.id) || {};
      if (name && u.fullName.toLowerCase().indexOf(name) === -1) return false;
      if (location && String(u.location || "").toLowerCase().indexOf(location) === -1) return false;
      if (category && p.category !== category) return false;
      if (exp && p.experienceLevel !== exp) return false;
      if (skill) {
        var hay = (p.skills || []).join(" ").toLowerCase() + " " + (p.professionalTitle || "").toLowerCase() + " " + (p.about || "").toLowerCase();
        if (hay.indexOf(skill) === -1) return false;
      }
      return true;
    });
    document.getElementById("candidates-count").textContent = results.length + (results.length === 1 ? " candidate found" : " candidates found");
    var box = document.getElementById("candidates-results");
    if (!results.length) {
      box.innerHTML = '<p class="empty">No candidates found. Try changing your search filters.</p>';
      return;
    }
    box.innerHTML = results.map(function (u) { return candidateCardHtml(u, getProfile(u.id)); }).join("");
  }
  document.getElementById("candidate-search").addEventListener("submit", function (e) {
    e.preventDefault();
    render();
  });
  ["c-name", "c-skill", "c-location"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
  });
  document.getElementById("c-category").addEventListener("change", render);
  document.getElementById("c-exp").addEventListener("change", render);
  render();
}

function initCandidateDetails() {
  var id = getQuery("id");
  var user = getUserById(id);
  var root = document.getElementById("candidate-root");
  if (!user || user.role !== "seeker") {
    root.innerHTML = '<p class="empty">This candidate could not be found.</p>';
    return;
  }
  var p = getProfile(id) || {};
  root.innerHTML =
    '<article class="panel"><div class="profile-head"><div class="avatar lg" aria-hidden="true">' + escapeHtml(initials(user.fullName)) + "</div><div>" +
    "<h1>" + escapeHtml(user.fullName) + "</h1>" +
    "<p>" + escapeHtml(p.professionalTitle || "Job seeker") + "</p>" +
    '<p class="meta">' + escapeHtml(user.location || "") + "</p></div></div>" +
    "<h2>About</h2><p>" + escapeHtml(p.about || "No about text yet.") + "</p>" +
    "<h2>Skills</h2><div class='skill-list'>" + (p.skills || []).map(function (s) { return '<span class="chip">' + escapeHtml(s) + "</span>"; }).join("") + "</div>" +
    "<h2>Experience</h2><p>" + escapeHtml(p.experienceText || "") + " (" + escapeHtml(p.experienceLevel || "") + ")</p>" +
    "<h2>Education</h2><p>" + escapeHtml(p.education || "") + "</p>" +
    "<h2>Resume</h2><p>" + escapeHtml(p.resume || "Resume.pdf") + " (placeholder file)</p>" +
    '<div class="actions" style="margin-top:1rem;">' +
    '<button type="button" class="btn" id="contact-candidate">Contact Candidate</button>' +
    '<button type="button" class="btn btn-secondary" id="invite-candidate">Invite to Apply</button>' +
    "</div></article>";
  document.getElementById("contact-candidate").addEventListener("click", function () {
    var me = getCurrentUser();
    if (!me || me.role !== "employer") {
      showToast("Log in as an employer to contact candidates.");
      return;
    }
    showToast("Message sent to " + user.fullName + " (demo only — no email is sent).");
  });
  document.getElementById("invite-candidate").addEventListener("click", function () {
    var me = getCurrentUser();
    if (!me || me.role !== "employer") {
      showToast("Log in as an employer to invite candidates.");
      return;
    }
    showToast("Invite sent to " + user.fullName + " (demo only — no email is sent).");
  });
}

/* ========== Boot ========== */
document.addEventListener("DOMContentLoaded", function () {
  seedIfNeeded();
  renderNav();
  renderFooter();
  setupHamburger();
  var page = document.body.getAttribute("data-page");
  var pages = {
    home: initHome,
    jobs: initJobs,
    "job-details": initJobDetails,
    login: initLogin,
    register: initRegister,
    dashboard: initDashboard,
    applications: initApplications,
    "saved-jobs": initSavedJobs,
    profile: initProfile,
    "employer-dashboard": initEmployerDashboard,
    "post-job": initPostJob,
    candidates: initCandidates,
    "candidate-details": initCandidateDetails
  };
  if (pages[page]) pages[page]();
});
