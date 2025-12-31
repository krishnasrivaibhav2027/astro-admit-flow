/**
 * Google Apps Script - Form Submission Webhook
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Form
 * 2. Click the 3-dot menu → Script editor
 * 3. Paste this code
 * 4. Update WEBHOOK_URL below with your backend URL
 * 5. Run → Run function → onFormSubmit (to authorize)
 * 6. Triggers → Add trigger → onFormSubmit → On form submit
 * 
 * FORM FIELDS REQUIRED (in this exact order):
 * 1. Institution Name (dropdown or text)
 * 2. Full Name (text)
 * 3. Email Address (text)
 * 4. Phone Number (text, optional)
 * 5. Stream/Course (dropdown or text, optional)
 */

// ===== CONFIGURATION =====
//const WEBHOOK_URL = 'YOUR_BACKEND_URL/api/institutions/form-webhook';
// Example: const WEBHOOK_URL = 'https://your-domain.com/api/institutions/form-webhook';
// For local testing via localtunnel:
const WEBHOOK_URL = 'https://proud-mails-shave.loca.lt/api/institutions/form-webhook';

// ===== MAIN FUNCTION =====
function onFormSubmit(e) {
    try {
        const responses = e.response.getItemResponses();

        // Helper to find response by question title (Case insensitive)
        const getResponseByTitle = (title) => {
            const item = responses.find(r => r.getItem().getTitle().toLowerCase().trim() === title.toLowerCase().trim());
            return item ? item.getResponse() : "";
        };

        // Helper to get file upload response
        const getFileUrl = (title) => {
            const item = responses.find(r => r.getItem().getTitle().toLowerCase().trim() === title.toLowerCase().trim());
            if (!item) return null;

            const fileId = item.getResponse()[0]; // File upload returns array of IDs
            if (!fileId) return null;

            try {
                const file = DriveApp.getFileById(fileId);
                file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                return file.getUrl();
            } catch (e) {
                Logger.log('Error getting file URL: ' + e);
                return null;
            }
        };

        // Extract data using Field Titles (Robust to reordering)
        // UPDATE THESE STRINGS if your form titles are different
        const data = {
            full_name: getResponseByTitle("Full Name"),
            email: getResponseByTitle("Email address"),
            phone: getResponseByTitle("Phone number"),
            institution_name: getResponseByTitle("Institution"),
            stream: getResponseByTitle("Stream"),
            scorecard_url: getFileUrl("Upload your High school score card")
        };

        // Fallback for Email if it's collected automatically
        if (!data.email && e.response.getRespondentEmail()) {
            data.email = e.response.getRespondentEmail();
        }

        // Validate required fields
        if (!data.institution_name || !data.full_name || !data.email) {
            Logger.log('Error: Missing required fields');
            return;
        }

        // Send to backend webhook
        const options = {
            method: 'POST',
            contentType: 'application/json',
            payload: JSON.stringify(data),
            muteHttpExceptions: true,
            headers: {
                "Bypass-Tunnel-Reminder": "true",
                "User-Agent": "Google-Apps-Script"
            }
        };

        const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
        const result = JSON.parse(response.getContentText());

        Logger.log('Webhook response: ' + JSON.stringify(result));

        // Optional: Send confirmation email to student
        if (result.success) {
            sendConfirmationEmail(data.email, data.full_name, data.institution_name);
        }

    } catch (error) {
        Logger.log('Error in onFormSubmit: ' + error.toString());
    }
}

// ===== HELPER FUNCTIONS =====
function sendConfirmationEmail(email, name, institution) {
    try {
        const subject = 'Access Request Received - AdmitFlow';
        const body = `
Dear ${name},

Your access request for ${institution} has been submitted successfully.

What happens next:
1. The institution admin will review your request
2. Once approved, you'll receive an email with login instructions
3. You can then access the admission assessment platform

If you have questions, please contact your institution directly.

Best regards,
AdmitFlow Team
    `;

        GmailApp.sendEmail(email, subject, body);
        Logger.log('Confirmation email sent to: ' + email);
    } catch (error) {
        Logger.log('Error sending email: ' + error.toString());
    }
}

// ===== TEST FUNCTION =====
function testWebhook() {
    const testData = {
        institution_name: 'Test Institution',
        full_name: 'Test Student',
        email: 'test@example.com',
        phone: '9876543210',
        stream: 'Science'
    };

    const options = {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(testData),
        muteHttpExceptions: true
    };

    try {
        const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
        Logger.log('Test response: ' + response.getContentText());
    } catch (error) {
        Logger.log('Test error: ' + error.toString());
    }
}
