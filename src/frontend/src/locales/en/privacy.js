// Privacy notice shown at /privacy. It describes what this system does with personal data; the
// institution that runs it is the controller and supplies its own contact details (backend
// settings PRIVACY_*), which the page fills in.
export default {
  title: 'Privacy notice',
  intro:
    'This page explains which personal data this student management system holds and how it is handled. It describes the system itself. The institution that operates it is the data controller, and where the institution has published its own privacy notice, that notice takes precedence.',
  back: 'Back',
  loading: 'Loading…',

  controllerTitle: 'Who is responsible for your data',
  controllerNamed: 'The data controller is {{name}}.',
  controllerContact: 'Contact for privacy questions and requests: {{contact}}',
  controllerDpo: 'Data protection officer: {{contact}}',
  controllerNoticeLink: "The institution's full privacy notice",
  controllerNotConfigured:
    'The institution that operates this system is the data controller. Its contact details have not been entered in this installation yet; please ask the school office.',

  dataTitle: 'What data is kept',
  dataStudents:
    "Students: name, student number, e-mail address, phone numbers, father's name, class and year of study, course enrolments, grades, attendance and absences, daily performance, highlights and staff notes.",
  dataHealth:
    'Health information is not recorded by default. Where the institution has switched it on, it can be seen and changed by administrators only, it is not shown in student lists, and it is left out of exported files unless an administrator asks for it.',
  dataStaff:
    'Staff accounts: name, e-mail address, role, a protected (hashed) password, sign-in attempts and a log of the changes each account makes.',

  purposeTitle: 'Why it is kept',
  purposeText:
    'The data is used to run courses, record attendance and grades, apply the absence rules and produce the reports the institution needs.',
  purposeBasis:
    'The institution decides the legal basis for this processing. For a public educational body it is normally the performance of a task in the public interest or a legal obligation (Article 6(1)(e) and (c) GDPR). This system does not itself collect consent; if the institution needs your consent for something, it asks you separately.',

  accessTitle: 'Who can see it',
  accessText:
    'Only people with an account, according to their role: administrators, teachers and office staff. A student account sees its own records only. The data is not sold, not used for advertising and not shared with third parties by this system.',
  accessHosting:
    'The data is stored in the database the institution has chosen for this system. Ask the institution where it is hosted.',

  cookiesTitle: 'Cookies and storage on your device',
  cookiesText:
    'The system uses only what it needs in order to work: a sign-in cookie that keeps you logged in and a security cookie that protects forms. On your device it also remembers your language, theme and date format.',
  cookiesNone:
    'There are no advertising or analytics cookies, no tracking and no third-party scripts. Because everything used is strictly necessary, no cookie banner is shown.',

  retentionTitle: 'How long it is kept',
  retentionText:
    "Records are kept for as long as the institution's retention rules require. Ask the institution for the periods that apply to you.",

  rightsTitle: 'Your rights',
  rightsText:
    'You can ask the institution for access to your data, for corrections, for deletion or restriction where the law allows it, and you can object to the processing. Send your request to the contact above.',
  rightsComplaint:
    'You also have the right to complain to the Commissioner for Personal Data Protection of the Republic of Cyprus (www.dataprotection.gov.cy).',
};
