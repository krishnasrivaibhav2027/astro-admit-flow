import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465
SENDER_EMAIL = "vausdevguptha@gmail.com"
SENDER_PASSWORD = "iwptfueiezguynxh"
RECIPIENT_EMAIL = "versatilevaibhu@gmail.com"

def test_smtp_connection():
    print(f"Testing SMTP connection to {SMTP_SERVER}:{SMTP_PORT}...")
    try:
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)

        print("Logging in...")
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        print("Login SUCCESSFUL!")

        msg = MIMEMultipart()
        msg["From"] = SENDER_EMAIL
        msg["To"] = RECIPIENT_EMAIL
        msg["Subject"] = "Test Email from Astro Admit Flow"
        msg.attach(MIMEText(
            "If you are reading this, your SMTP App Password is correct!",
            "plain"
        ))

        print("Sending email...")
        server.send_message(msg)
        print("Email sent SUCCESSFULLY!")

        server.quit()
        return True

    except Exception as e:
        print("\n❌ SMTP CONNECTION FAILED")
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_smtp_connection()
