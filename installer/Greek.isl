; *** Inno Setup version 6.0.x Greek messages (normalized for Windows-1253) ***
;
; Minimal Greek language file providing LangOptions and CustomMessages.
; Base messages fall back to compiler defaults to avoid version warnings.

[LangOptions]
LanguageCodePage=1253
LanguageName=Ελληνικά
LanguageID=$0408
LanguageCodePage=65001

[Messages]
; Essential Greek messages for installer UI

; *** Application titles
SetupAppTitle=Εγκατάσταση
SetupWindowTitle=Εγκατάσταση - %1
UninstallAppTitle=Απεγκατάσταση
UninstallAppFullTitle=%1 Απεγκατάσταση

; *** Misc. common
InformationTitle=Πληροφορίες
ConfirmTitle=Επιβεβαίωση
ErrorTitle=Σφάλμα

; *** SetupLdr messages
SetupLdrStartupMessage=Θα εγκατασταθεί η εφαρμογή %1. Θέλετε να συνεχίσετε;
LdrCannotCreateTemp=Αδυναμία δημιουργίας προσωρινού αρχείου. Η εγκατάσταση ματαιώθηκε
LdrCannotExecTemp=Αδυναμία εκτέλεσης αρχείου στον κατάλογο προσωρινών αρχείων. Η εγκατάσταση ματαιώθηκε

; *** Startup error messages
LastErrorMessage=%1.%n%nΣφάλμα %2: %3
SetupFileMissing=Το αρχείο %1 λείπει από τον κατάλογο εγκατάστασης. Παρακαλώ διορθώστε το πρόβλημα ή αποκτήστε νέο αντίγραφο του προγράμματος.
SetupFileCorrupt=Τα αρχεία εγκατάστασης είναι κατεστραμμένα. Παρακαλώ αποκτήστε νέο αντίγραφο του προγράμματος.
SetupFileCorruptOrWrongVer=Τα αρχεία εγκατάστασης είναι κατεστραμμένα ή δεν είναι συμβατά με αυτή την έκδοση του προγράμματος εγκατάστασης. Παρακαλώ διορθώστε το πρόβλημα ή αποκτήστε νέο αντίγραφο του προγράμματος.

; *** Startup questions
PrivilegesRequiredOverrideTitle=Επιλογή τύπου εγκατάστασης
PrivilegesRequiredOverrideInstruction=Επιλέξτε τον τύπο εγκατάστασης
PrivilegesRequiredOverrideText1=Το %1 μπορεί να εγκατασταθεί για όλους τους χρήστες (απαιτεί δικαιώματα διαχειριστή) ή μόνο για εσάς.
PrivilegesRequiredOverrideAllUsers=Εγκατάσταση για &όλους τους χρήστες
PrivilegesRequiredOverrideAllUsersRecommended=Εγκατάσταση για ό&λους τους χρήστες (συνιστάται)
PrivilegesRequiredOverrideCurrentUser=Εγκατάσταση μόνο για &εμένα
PrivilegesRequiredOverrideCurrentUserRecommended=Εγκατάσταση μόνο για &εμένα (συνιστάται)

; *** Misc. errors
ErrorCreatingDir=Η εγκατάσταση δεν μπόρεσε να δημιουργήσει τον κατάλογο "%1"
ErrorTooManyFilesInDir=Δεν ήταν δυνατή η δημιουργία ενός αρχείου στον κατάλογο "%1" επειδή περιέχει πάρα πολλά αρχεία

; *** Setup common messages
ExitSetupTitle=Έξοδος Εγκατάστασης
ExitSetupMessage=Η εγκατάσταση δεν έχει ολοκληρωθεί. Αν την εγκαταλείψετε τώρα, το πρόγραμμα δεν θα εγκατασταθεί.%n%nΜπορείτε να εκτελέσετε ξανά την εγκατάσταση αργότερα.%n%nΈξοδος;
AboutSetupMenuItem=&Σχετικά με την εγκατάσταση...
AboutSetupTitle=Σχετικά με την εγκατάσταση
AboutSetupMessage=%1 έκδοση %2%n%3%n%n%1 αρχική σελίδα:%n%4
AboutSetupNote=
TranslatorNote=

; *** Buttons
ButtonBack=< &Πίσω
ButtonNext=&Επόμενο >
ButtonInstall=&Εγκατάσταση
ButtonOK=OK
ButtonCancel=&Άκυρο
ButtonYes=Ν&αι
ButtonYesToAll=Ναι σε &όλα
ButtonNo=Ό&χι
ButtonNoToAll=Όχι &σε όλα
ButtonFinish=&Τέλος
ButtonBrowse=&Αναζήτηση...
ButtonWizardBrowse=Ανα&ζήτηση...
ButtonNewFolder=&Δημιουργία νέου καταλόγου

; *** "Select Language" dialog messages
SelectLanguageTitle=Επιλογή γλώσσας οδηγού εγκατάστασης
SelectLanguageLabel=Επιλέξτε τη γλώσσα που θα χρησιμοποιηθεί κατά την εγκατάσταση.

; *** Common wizard text
ClickNext=Κάντε κλικ στο Επόμενο για να συνεχίσετε ή Άκυρο για να εγκαταλείψετε την εγκατάσταση.
BeveledLabel=
BrowseDialogTitle=Αναζήτηση καταλόγου
BrowseDialogLabel=Επιλέξτε έναν κατάλογο από την παρακάτω λίστα και κάντε κλικ στο OK.
NewFolderName=Νέος Κατάλογος

; *** "Welcome" wizard page
WelcomeLabel1=Καλώς ορίσατε στον οδηγό εγκατάστασης του [name]
WelcomeLabel2=Θα γίνει εγκατάσταση του [name/ver] στον υπολογιστή σας.%n%nΣυνιστάται να κλείσετε όλες τις άλλες εφαρμογές πριν συνεχίσετε.

; *** "Password" wizard page
WizardPassword=Κωδικός πρόσβασης
PasswordLabel1=Αυτή η εγκατάσταση προστατεύεται με κωδικό πρόσβασης.
PasswordLabel3=Παρακαλώ δώστε τον κωδικό σας και κάντε κλικ στο Επόμενο.
PasswordEditLabel=&Κωδικός:
IncorrectPassword=Ο κωδικός που έχετε δώσει είναι λανθασμένος. Παρακαλώ, προσπαθήστε ξανά.

; *** "License Agreement" wizard page
WizardLicense=Άδεια Χρήσης
LicenseLabel=Παρακαλώ διαβάστε προσεκτικά τις ακόλουθες πληροφορίες πριν συνεχίσετε.
LicenseLabel3=Παρακαλώ διαβάστε την παρακάτω άδεια χρήσης. Θα πρέπει να αποδεχτείτε αυτή την άδεια πριν συνεχίσετε με την εγκατάσταση.
LicenseAccepted=&Αποδέχομαι αυτή την άδεια και τους όρους χρήσης
LicenseNotAccepted=Δεν &αποδέχομαι αυτή την άδεια και τους όρους χρήσης

; *** "Information" wizard pages
WizardInfoBefore=Πληροφορίες
InfoBeforeLabel=Παρακαλώ διαβάστε προσεκτικά τις ακόλουθες πληροφορίες πριν συνεχίσετε.
InfoBeforeClickLabel=Όταν είστε έτοιμοι να συνεχίσετε με την οδηγό εγκατάστασης, κάντε κλικ στο Επόμενο.
WizardInfoAfter=Πληροφορίες
InfoAfterLabel=Παρακαλώ διαβάστε προσεκτικά τις ακόλουθες πληροφορίες πριν συνεχίσετε.
InfoAfterClickLabel=Όταν είστε έτοιμοι να συνεχίσετε με την οδηγό εγκατάστασης, κάντε κλικ στο Επόμενο.

; *** "User Information" wizard page
WizardUserInfo=Πληροφορίες Χρήστη
UserInfoDesc=Παρακαλώ εισάγετε τα στοιχεία σας.
UserInfoName=&Όνομα Χρήστη:
UserInfoOrg=&Οργανισμός:
UserInfoSerial=&Σειριακός Αριθμός:
UserInfoNameRequired=Πρέπει να εισάγετε ένα όνομα.

; *** "Select Destination Location" wizard page
WizardSelectDir=Επιλογή Θέσης Εγκατάστασης
SelectDirDesc=Πού πρέπει να εγκατασταθεί το [name];
SelectDirLabel3=Ο οδηγός εγκατάστασης θα εγκαταστήσει το [name] στον παρακάτω κατάλογο.
SelectDirBrowseLabel=Για να συνεχίσετε, κάντε κλικ στο Επόμενο. Αν θέλετε να επιλέξετε διαφορετικό κατάλογο, κάντε κλικ στο Αναζήτηση.
DiskSpaceGBLabel=Απαιτούνται τουλάχιστον [gb] GB ελεύθερου χώρου στο δίσκο.
DiskSpaceMBLabel=Απαιτούνται τουλάχιστον [mb] MB ελεύθερου χώρου στο δίσκο.
CannotInstallToNetworkDrive=Η εγκατάσταση δεν μπορεί να γίνει σε δίσκο δικτύου.
CannotInstallToUNCPath=Η εγκατάσταση δεν μπορεί να γίνει σε διαδρομή UNC.
InvalidPath=Πρέπει να δώσετε μια πλήρη διαδρομή με το γράμμα δίσκου, για παράδειγμα:%n%nC:\APP%n%nή μια διαδρομή UNC της μορφής:%n%n\\server\share
InvalidDrive=Η μονάδα δίσκου ή η μονάδα δικτύου που έχετε επιλέξει δεν υπάρχει ή δεν είναι προσπελάσιμη. Παρακαλώ, επιλέξτε άλλη.
DiskSpaceWarningTitle=Ανεπαρκής χώρος στο δίσκο
DiskSpaceWarning=Η εγκατάσταση χρειάζεται τουλάχιστον %1 KB ελεύθερο χώρο γιά να γίνει αλλά η επιλεγμένη μονάδα δίσκου διαθέτει μόνο %2 KB.%n%nΘέλετε να συνεχίσετε παρόλα αυτά;
DirNameTooLong=Το όνομα ή η διαδρομή του καταλόγου είναι πολύ μεγάλη.
InvalidDirName=Το όνομα του καταλόγου δεν είναι έγκυρο.
BadDirName32=Το όνομα του καταλόγου δεν μπορεί να περιλαμβάνει κανέναν από τους ακόλουθους χαρακτήρες:%n%n%1
DirExistsTitle=Ο Κατάλογος Υπάρχει
DirExists=Ο κατάλογος:%n%n%1%n%nυπάρχει ήδη. Θέλετε να γίνει η εγκατάσταση σε αυτόν τον κατάλογο παρόλα αυτά;
DirDoesntExistTitle=Ο Κατάλογος Δεν Υπάρχει
DirDoesntExist=Ο κατάλογος:%n%n%1%n%nδεν υπάρχει. Θέλετε να δημιουργηθεί;

; *** "Select Components" wizard page
WizardSelectComponents=Επιλογή Στοιχείων Σύστησης
SelectComponentsDesc=Ποια στοιχεία πρέπει να εγκατασταθούν;
SelectComponentsLabel2=Επιλέξτε τα στοιχεία που θέλετε να εγκατασταθούν, αποεπιλέξτε τα στοιχεία που δεν θέλετε να εγκατασταθούν. Κάντε κλικ στο Επόμενο όταν είστε έτοιμοι να συνεχίσετε.
FullInstallation=Πλήρης εγκατάσταση
CompactInstallation=Συμπαγής εγκατάσταση
CustomInstallation=Προσαρμοσμένη εγκατάσταση
NoUninstallWarningTitle=Τα Στοιχεία Αυτά Υπάρχουν
NoUninstallWarning=Ο οδηγός εγκατάστασης εντόπισε ότι τα παρακάτω στοιχεία είναι ήδη εγκατεστημένα στον υπολογιστή σας:%n%n%1%n%nΑποεπιλέγοντας αυτά τα στοιχεία δεν θα απεγκατασταθούν.%n%nΘέλετε να συνεχίσετε παρόλα αυτά;
ComponentSize1=%1 KB
ComponentSize2=%1 MB
ComponentsDiskSpaceGBLabel=Η τρέχουσα επιλογή χρειάζεται τουλάχιστον [gb] GB χώρο στο δίσκο.
ComponentsDiskSpaceMBLabel=Η τρέχουσα επιλογή χρειάζεται τουλάχιστον [mb] MB χώρο στο δίσκο.

; *** "Select Additional Tasks" wizard page
WizardSelectTasks=Επιλογή Πρόσθετων Διεργασιών
SelectTasksDesc=Ποιες πρόσθετες διεργασίες πρέπει να γίνουν;
SelectTasksLabel2=Επιλέξτε τις πρόσθετες διεργασίες που θέλετε να γίνουν κατά την εγκατάσταση του [name] και κάντε κλικ στο Επόμενο.

; *** "Select Start Menu Folder" wizard page
WizardSelectProgramGroup=Επιλογή Ομάδας Μενού Έναρξης
SelectStartMenuFolderDesc=Πού πρέπει να δημιουργηθούν οι συντομεύσεις του προγράμματος;
SelectStartMenuFolderLabel3=Ο οδηγός εγκατάστασης θα δημιουργήσει τις συντομεύσεις του προγράμματος στον παρακάτω φάκελο του μενού Έναρξης.
SelectStartMenuFolderBrowseLabel=Για να συνεχίσετε, κάντε κλικ στο Επόμενο. Αν θέλετε επιλέξετε άλλο φάκελο, κάντε κλικ στο Αναζήτηση.
MustEnterGroupName=Πρέπει να εισάγετε ένα όνομα ομάδας.
GroupNameTooLong=Το όνομα ή η διαδρομή του φακέλου είναι πολύ μεγάλη.
InvalidGroupName=Το όνομα του φακέλου δεν είναι έγκυρο.
BadGroupName=Το όνομα του φακέλου δεν μπορεί να περιλαμβάνει κανέναν από τους ακόλουθους χαρακτήρες:%n%n%1
NoProgramGroupCheck2=&Χωρίς δημιουργία φακέλου στο μενού Έναρξης

; *** "Ready to Install" wizard page
WizardReady=Έτοιμο για Εγκατάσταση
ReadyLabel1=Ο οδηγός εγκατάστασης είναι έτοιμος να ξεκινήσει την εγκατάσταση του [name] στον υπολογιστή σας.
ReadyLabel2a=Κάντε κλικ στο Εγκατάσταση για να συνεχίσετε με την εγκατάσταση ή κάντε κλικ στο Πίσω, αν θέλετε να δείτε ή να αλλάξετε κάποιες επιλογές.
ReadyLabel2b=Κάντε κλικ στο Εγκατάσταση για να συνεχίσετε την εγκατάσταση.
ReadyMemoUserInfo=Πληροφορίες χρήστη:
ReadyMemoDir=Θέση εγκατάστασης:
ReadyMemoType=Τύπος εγκατάστασης:
ReadyMemoComponents=Επιλεγμένα εγκατεστημένα στοιχεία:
ReadyMemoGroup=Φάκελος στο μενού Έναρξης:
ReadyMemoTasks=Πρόσθετες διεργασίες:

; *** "Preparing to Install" wizard page
WizardPreparing=Προετοιμασία Εγκατάστασης
PreparingDesc=Ο οδηγός εγκατάστασης προετοιμάζεται για την εγκατάσταση του [name] στον υπολογιστή σας.
PreviousInstallNotCompleted=Η εγκατάσταση/αφαίρεση ενός προηγούμενου προγράμματος δεν ολοκληρώθηκε. Θα πρέπει να κάνετε επανεκκίνηση του υπολογιστή σας για να ολοκληρωθεί.%n%nΜετά την επανεκκίνηση του υπολογιστή σας, εκτελέστε ξανά τον οδηγό εγκατάστασης για να ολοκληρώσετε την εγκατάσταση/αφαίρεση του [name].
CannotContinue=Η εγκατάσταση δεν μπορεί να συνεχιστεί. Παρακαλώ κάντε κλικ στο Άκυρο για έξοδο.
ApplicationsFound=Οι παρακάτω εφαρμογές χρησιμοποιούν αρχεία που πρέπει να ενημερωθούν από τον οδηγό εγκατάστασης. Συνιστάται να επιτρέψετε στον οδηγό εγκατάστασης να κλείσει αυτόματα αυτές τις εφαρμογές.
ApplicationsFound2=Οι παρακάτω εφαρμογές χρησιμοποιούν αρχεία που πρέπει να ενημερωθούν από τον οδηγό εγκατάστασης. Συνιστάται να επιτρέψετε στον οδηγό εγκατάστασης να κλείσει αυτόματα αυτές τις εφαρμογές. Μετά την ολοκλήρωση της εγκατάστασης, ο οδηγός εγκατάστασης θα προσπαθήσει να ξανά εκκινήσει αυτές τις εφαρμογές.
CloseApplications=&Αυτόματο κλείσιμο των εφαρμογών
DontCloseApplications=&Χωρίς κλείσιμο των εφαρμογών
ErrorCloseApplications=Ο οδηγός εγκατάστασης δεν μπόρεσε να κλείσει αυτόματα όλες τις εφαρμογές. Συνιστάται να κλείσετε όλες τις εφαρμογές που χρησιμοποιούν αρχεία που πρέπει να ενημερωθούν από τον οδηγό εγκατάστασης πριν συνεχίσετε.

; *** "Installing" wizard page
WizardInstalling=Εγκατάσταση
InstallingLabel=Παρακαλώ περιμένετε καθώς γίνεται η εγκατάσταση του [name] στον υπολογιστή σας.

; *** "Setup Completed" wizard page
FinishedHeadingLabel=Ολοκλήρωση του οδηγού εγκατάστασης του [name]
FinishedLabelNoIcons=Ο οδηγός εγκατάστασης ολοκλήρωσε την εγκατάσταση του [name] στον υπολογιστή σας.
FinishedLabel=Ο οδηγός εγκατάστασης ολοκλήρωσε την εγκατάσταση του [name] στον υπολογιστή σας. Η εφαρμογή μπορεί να εκτελεστεί επιλέγοντας κάποια από τις εγκατεστημένες συντομεύσεις.
ClickFinish=Κάντε κλικ στο Τέλος για να εγκαταλείψετε τον οδηγό εγκατάστασης.
FinishedRestartLabel=Για να ολοκληρωθεί η εγκατάσταση του [name], ο οδηγός εγκατάστασης πρέπει να κάνει επανεκκίνηση του υπολογιστή σας. Θα θέλατε να κάνετε επανεκκίνηση τώρα;
FinishedRestartMessage=Για να ολοκληρωθεί η εγκατάσταση του [name], ο οδηγός εγκατάστασης πρέπει να κάνει επανεκκίνηση του υπολογιστή σας.%n%nΘα θέλατε να κάνετε επανεκκίνηση τώρα;
ShowReadmeCheck=Ναι, θα ήθελα να δω το αρχείο README
YesRadio=&Ναι, να γίνει επανεκκίνηση τώρα
NoRadio=&Όχι, θα γίνει επανεκκίνηση αργότερα
RunEntryExec=Εκτέλεση του %1
RunEntryShellExec=Προβολή του %1

; *** "Setup Needs the Next Disk" stuff
ChangeDiskTitle=Ο Οδηγός Εγκατάστασης Χρειάζεται τον Επόμενο Δίσκο
SelectDiskLabel2=Παρακαλώ, εισάγετε τον Δίσκο %1 και κάντε κλικ στο OK.%n%nΑν τα αρχεία αυτού του δίσκου βρίσκονται σε φάκελο διαφορετικό από αυτόν που εμφανίζεται παρακάτω, πληκτρολογήστε τη σωστή διαδρομή ή κάντε κλικ στο Αναζήτηση.
PathLabel=&Διαδρομή:
FileNotInDir2=Το αρχείο "%1" δε βρέθηκε στο "%2". Παρακαλώ εισάγετε το σωστό δίσκο ή επιλέξτε διαφορετικό κατάλογο.
SelectDirectoryLabel=Παρακαλώ καθορίστε την τοποθεσία του επόμενου δίσκου.

; *** Installation phase messages
SetupAborted=Η εγκατάσταση δεν ολοκληρώθηκε.%n%nΠαρακαλώ, διορθώστε το πρόβλημα και εκτελέστε ξανά τον οδηγό εγκατάστασης.
AbortRetryIgnoreSelectAction=Επιλογή ενέργειας
AbortRetryIgnoreRetry=&Επανάληψη
AbortRetryIgnoreIgnore=&Αγνόηση του σφάλματος
AbortRetryIgnoreCancel=Ακύρωση εγκατάστασης

; *** Installation status messages
StatusClosingApplications=Κλείσιμο εφαρμογών...
StatusCreateDirs=Δημιουργία καταλόγων...
StatusExtractFiles=Αποσυμπίεση αρχείων...
StatusCreateIcons=Δημιουργία συντομεύσεων...
StatusCreateIniEntries=Δημιουργία καταχωρήσεων INI...
StatusCreateRegistryEntries=Δημιουργία καταχωρήσεων στο μητρώο...
StatusRegisterFiles=Καταχώρηση αρχείων...
StatusSavingUninstall=Αποθήκευση πληροφοριών απεγκατάστασης...
StatusRunProgram=Ολοκλήρωση εγκατάστασης...
StatusRestartingApplications=Επανεκκίνηση εφαρμογών...
StatusRollback=Αναίρεση αλλαγών...

; *** Misc. errors
ErrorInternal2=Εσωτερικό σφάλμα: %1
ErrorFunctionFailedNoCode=%1 απέτυχε
ErrorFunctionFailed=%1 απέτυχε, κωδικός %2
ErrorFunctionFailedWithMessage=%1 απέτυχε, κωδικός %2.%n%3
ErrorExecutingProgram=Δεν ήταν δυνατή η εκτέλεση του αρχείου:%n%1

; *** Registry errors
ErrorRegOpenKey=Σφάλμα ανοίγματος κλειδιού μητρώου:%n%1\%2
ErrorRegCreateKey=Σφάλμα δημιουργίας κλειδιού μητρώου:%n%1\%2
ErrorRegWriteKey=Σφάλμα εγγραφής κλειδιού μητρώου:%n%1\%2

; *** INI errors
ErrorIniEntry=Σφάλμα στη δημιουργία καταχώρησης INI στο αρχείο "%1".

; *** File copying errors
FileAbortRetryIgnoreSkipNotRecommended=&Παράλειψη αυτού του αρχείου (δεν συνιστάται)
FileAbortRetryIgnoreIgnoreNotRecommended=Παράλειψη σφάλματος και &συνέχιση (δεν συνιστάται)
SourceIsCorrupted=Το αρχείο προέλευσης είναι κατεστραμμένο
SourceDoesntExist=Το αρχείο προέλευσης "%1" δεν υπάρχει
ExistingFileReadOnly2=Το υπάρχον αρχείο δεν μπόρεσε να αντικατασταθεί επειδή είναι μόνο για ανάγνωση.
ExistingFileReadOnlyRetry=&Αφαίρεση του χαρακτηρισμού μόνο για ανάγνωση και επανάληψη ξανά
ExistingFileReadOnlyKeepExisting=&Διατήρηση του υπάρχοντος αρχείου
ErrorReadingExistingDest=Παρουσιάστηκε σφάλμα κατά την προσπάθεια ανάγνωσης του υπάρχοντος αρχείου:
FileExists=Το αρχείο υπάρχει ήδη.
ExistingFileNewer=Το υπάρχον αρχείο είναι νεότερο από το αρχείο που προσπαθείτε να εγκαταστήσετε.
ErrorChangingAttr=Παρουσιάστηκε σφάλμα κατά την προσπάθεια αλλαγής των χαρακτηριστικών του υπάρχοντος αρχείου:
ErrorCreatingTemp=Παρουσιάστηκε σφάλμα κατά την προσπάθεια δημιουργίας ενός αρχείου στον φάκελο προορισμού:
ErrorReadingSource=Παρουσιάστηκε σφάλμα κατά την προσπάθεια ανάγνωσης του αρχείου προέλευσης:
ErrorCopying=Παρουσιάστηκε σφάλμα κατά την προσπάθεια αντιγραφής ενός αρχείου:
ErrorReplacingExistingFile=Παρουσιάστηκε σφάλμα κατά την προσπάθεια αντικατάστασης του υπάρχοντος αρχείου:
ErrorRestartReplace=Η επανεκκίνηση/αντικατάσταση απέτυχε:
ErrorRenamingTemp=Παρουσιάστηκε σφάλμα κατά την προσπάθεια μετονομασίας ενός αρχείου στον φάκελο προορισμού:
ErrorRegisterServer=Δεν ήταν δυνατή η καταχώρηση του DLL/OCX: %1
ErrorRegSvr32Failed=Το RegSvr32 απέτυχε με κωδικό εξόδου %1
ErrorRegisterTypeLib=Δεν ήταν δυνατή η καταχώρηση της βιβλιοθήκης τύπων: %1

; *** Uninstall display name markings
UninstallDisplayNameMark=%1 (%2)
UninstallDisplayNameMarks=%1 (%2, %3)
UninstallDisplayNameMark32Bit=32-bit
UninstallDisplayNameMark64Bit=64-bit
UninstallDisplayNameMarkAllUsers=Όλοι οι χρήστες
UninstallDisplayNameMarkCurrentUser=Τρέχων χρήστης

; *** Post-installation errors
ErrorOpeningReadme=Παρουσιάστηκε σφάλμα κατά την προσπάθεια ανοίγματος του αρχείου README.
ErrorRestartingComputer=Ο οδηγός εγκατάστασης δεν μπόρεσε να κάνει επανεκκίνηση του υπολογιστή. Παρακαλώ επανεκκινήστε τον υπολογιστή ο ίδιος σας.

; *** Uninstaller messages
UninstallNotFound=Το αρχείο "%1" δεν υπάρχει. Δεν είναι δυνατή η απεγκατάσταση.
UninstallOpenError=Το αρχείο "%1" δεν είναι δυνατό να ανοιχθεί. Δεν είναι δυνατή η απεγκατάσταση
UninstallUnsupportedVer=Το αρχείο καταγραφής απεγκατάστασης "%1" είναι σε μορφή που δεν αναγνωρίζεται από αυτή την έκδοση του οδηγού της απεγκατάστασης. Δεν είναι δυνατή η απεγκατάσταση
UninstallUnknownEntry=Μία άγνωστη καταχώρηση (%1) βρέθηκε στο αρχείο καταγραφής απεγκατάστασης
ConfirmUninstall=Είστε σίγουροι ότι θέλετε να αφαιρέσετε πλήρως το %1 και όλα τα στοιχεία του;
UninstallOnlyOnWin64=Αυτή η εγκατάσταση μπορεί να απεγκατασταθεί μόνο σε Windows 64-bit.
OnlyAdminCanUninstall=Αυτή η εγκατάσταση μπορεί να απεγκατασταθεί μόνο από ένα χρήστη με δικαιώματα διαχειριστή.
UninstallStatusLabel=Παρακαλώ περιμένετε καθώς το αφαιρείται το %1 από τον υπολογιστή σας.
UninstalledAll=Το %1 αφαιρέθηκε με επιτυχία από τον υπολογιστή σας.
UninstalledMost=Το %1 ολοκληρώθηκε η απεγκατάσταση.%n%nΜερικά στοιχεία δεν είναι δυνατό να αφαιρεθούν. Αυτά μπορείτε να τα αφαιρέσετε ο ίδιος.
UninstalledAndNeedsRestart=Για να ολοκληρωθεί η απεγκατάσταση του %1, ο υπολογιστής σας πρέπει να επανεκκινηθεί.%n%nΘα θέλατε να κάνετε επανεκκίνηση τώρα;
UninstallDataCorrupted=Το "%1" αρχείο είναι κατεστραμμένο. Δεν είναι δυνατή η απεγκατάσταση

; *** Uninstallation phase messages
ConfirmDeleteSharedFileTitle=Αφαίρεση Κοινόχρηστου Αρχείου;
ConfirmDeleteSharedFile2=Το σύστημα υποδεικνύει ότι το παρακάτω κοινόχρηστο αρχείο δεν χρησιμοποιείται πλέον από άλλο πρόγραμμα. Θέλετε να αφαιρέσετε αυτό το κοινόχρηστο αρχείο;%n%nΑν κάποιο πρόγραμμα χρησιμοποιεί το το κοινόχρηστο αυτό αρχείο, επιλέξτε το Όχι και αφήστε το αρχείο στο σύστημα. Αν δεν είστε σίγουροι, επιλέξτε Όχι. Αφήνοντας το αρχείο στο σύστημα δεν θα προκαλέσει καμία βλάβη.
SharedFileNameLabel=Όνομα αρχείου:
SharedFileLocationLabel=Τοποθεσία:
WizardUninstalling=Κατάσταση Απεγκατάστασης
StatusUninstalling=Απεγκατάσταση %1...

[CustomMessages]
NameAndVersion=%1 έκδοση %2
AdditionalIcons=Πρόσθετα εικονίδια:
CreateDesktopIcon=Δημιουργία συντόμευσης στην &επιφάνεια εργασίας
CreateQuickLaunchIcon=Δημιουργία συντόμευσης στη &γραμμή εκκίνησης
ProgramOnTheWeb=Το %1 στο Internet
UninstallProgram=Απεγκατάσταση του %1
LaunchProgram=Εκτέλεση του %1
AssocFileExtension=&Συσχέτιση του %1 με την επέκταση αρχείου %2 
AssocingFileExtension=Γίνεται συσχέτιση του %1 με την επέκταση αρχείου "%2"...
AutoStartProgramGroupDescription=Εκκίνηση:
AutoStartProgram=Αυτόματη εκκίνηση του %1
AddonHostProgramNotFound=Το %1 δε βρέθηκε στον υπολογιστή σας.%n%nΘέλετε να συνεχίσετε χωρίς αυτό;

; Docker/SMS custom messages used by our installer
DockerRequired=Απαιτείται το Docker Desktop
DockerNotFound=Το Docker Desktop δεν εντοπίστηκε.%n%nΘέλετε να ανοίξετε τη σελίδα λήψης;
LaunchApp=Εκκίνηση του SMS μετά την εγκατάσταση
CreateShortcut=Δημιουργία συντόμευσης στην επιφάνεια εργασίας
BuildContainer=Δημιουργία Docker container (~5-10 λεπτά)
Prerequisites=Προαπαιτούμενα:
OpenDockerPage=Άνοιγμα σελίδας λήψης Docker Desktop
DockerInstalled=Το Docker Desktop είναι εγκατεστημένο
DockerNotInstalled=Το Docker Desktop ΔΕΝ είναι εγκατεστημένο
DockerRunning=Το Docker Desktop εκτελείται
DockerNotRunning=Το Docker Desktop δεν εκτελείται
BuildingContainer=Δημιουργία SMS Docker container...
FirstRunNote=Η πρώτη εκτέλεση θα δημιουργήσει το container (5-10 λεπτά)
ExistingInstallDetected=Εντοπίστηκε υπάρχουσα εγκατάσταση
ExistingVersionFound=Η έκδοση %1 είναι ήδη εγκατεστημένη στη διαδρομή:%n%2%n%nΤι θέλετε να κάνετε;
SameVersionFound=Η έκδοση %1 είναι ήδη εγκατεστημένη στη διαδρομή:%n%2%n%nΤι θέλετε να κάνετε;
UpgradeOption=Ενημέρωση/Αντικατάσταση (διατήρηση δεδομένων)
CleanInstallOption=Νέα εγκατάσταση (αφαίρεση προηγούμενης πρώτα)
CancelOption=Ακύρωση
KeepUserData=Διατήρηση δεδομένων χρήστη
RemoveOldVersion=Αφαίρεση προηγούμενης έκδοσης
UpgradePrompt=Πατήστε ΝΑΙ για ενημέρωση, ΟΧΙ για νέα εγκατάσταση, ή ΑΚΥΡΟ.
KeepDataPrompt=Θέλετε να διατηρήσετε τα δεδομένα σας;%n%nΠατήστε ΝΑΙ για διατήρηση.%nΠατήστε ΟΧΙ για διαγραφή όλων.
ViewReadme=Προβολή τεκμηρίωσης README
BackupCreated=Δημιουργήθηκε αντίγραφο ασφαλείας: %1
UpgradingFrom=Αναβάθμιση από έκδοση %1 σε %2
DockerStatusTitle=Κατάσταση Docker Desktop
DockerRefreshButton=Ανανέωση

; Prevent English fallbacks for common overwrite prompts
FileExists=Το αρχείο υπάρχει ήδη.
ExistingFileNewer=Το υπάρχον αρχείο είναι νεότερο από το αρχείο που προσπαθείτε να εγκαταστήσετε.
