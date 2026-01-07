"""
Email notification service for sending notifications via SMTP.
Supports both HTML and plain text templates with variable substitution.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from backend.config import settings

logger = logging.getLogger(__name__)


class EmailTemplates:
    """Email notification templates with variable substitution."""

    @staticmethod
    def grade_update(student_name: str, course_name: str, grade: float, max_grade: float) -> tuple[str, str]:
        """Grade update notification template.

        Args:
            student_name: Student's full name
            course_name: Course name
            grade: Grade received
            max_grade: Maximum possible grade

        Returns:
            Tuple of (subject, html_body)
        """
        subject = f"📊 Your grade in {course_name} has been posted"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Hello {student_name},</h2>
                    <p>Your grade for <strong>{course_name}</strong> has been posted.</p>

                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 10px 0;">
                            <strong>Course:</strong> {course_name}
                        </p>
                        <p style="margin: 10px 0;">
                            <strong>Grade:</strong> <span style="font-size: 24px; color: #2563eb;">
                                {grade}/{max_grade}
                            </span>
                        </p>
                        <p style="margin: 10px 0;">
                            <strong>Percentage:</strong> {(grade / max_grade * 100):.1f}%
                        </p>
                    </div>

                    <p>Log in to view detailed feedback and your complete grade history.</p>

                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This is an automated notification. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return subject, html_body

    @staticmethod
    def attendance_change(student_name: str, course_name: str, status: str, date: str) -> tuple[str, str]:
        """Attendance change notification template.

        Args:
            student_name: Student's full name
            course_name: Course name
            status: Attendance status (present, absent, late, excused)
            date: Date of class

        Returns:
            Tuple of (subject, html_body)
        """
        status_emoji = {
            "present": "✓",
            "absent": "✗",
            "late": "🕐",
            "excused": "✓",
        }.get(status, "ℹ️")

        status_display = status.title()
        subject = f"{status_emoji} Attendance recorded: {status_display} on {date}"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Hello {student_name},</h2>
                    <p>Your attendance for <strong>{course_name}</strong> on {date} has been recorded.</p>

                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 10px 0;">
                            <strong>Course:</strong> {course_name}
                        </p>
                        <p style="margin: 10px 0;">
                            <strong>Date:</strong> {date}
                        </p>
                        <p style="margin: 10px 0;">
                            <strong>Status:</strong>
                            <span style="font-size: 18px; color: #10b981; font-weight: bold;">
                                {status_emoji} {status_display}
                            </span>
                        </p>
                    </div>

                    <p>If you believe this is an error, please contact your instructor.</p>

                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This is an automated notification. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return subject, html_body

    @staticmethod
    def course_announcement(course_name: str, title: str, message: str) -> tuple[str, str]:
        """Course announcement notification template.

        Args:
            course_name: Course name
            title: Announcement title
            message: Announcement message

        Returns:
            Tuple of (subject, html_body)
        """
        subject = f"📢 Announcement in {course_name}: {title}"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>{course_name}: {title}</h2>

                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        {message}
                    </div>

                    <p>Log in to the system to see more details and participate in discussions.</p>

                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This is an automated notification. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return subject, html_body

    @staticmethod
    def assignment_posted(course_name: str, assignment_title: str, due_date: str) -> tuple[str, str]:
        """Assignment posted notification template.

        Args:
            course_name: Course name
            assignment_title: Assignment title
            due_date: Due date

        Returns:
            Tuple of (subject, html_body)
        """
        subject = f"📝 New assignment in {course_name}: {assignment_title}"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>New Assignment Posted</h2>

                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 10px 0;">
                            <strong>Course:</strong> {course_name}
                        </p>
                        <p style="margin: 10px 0;">
                            <strong>Assignment:</strong> {assignment_title}
                        </p>
                        <p style="margin: 10px 0;">
                            <strong>Due Date:</strong> {due_date}
                        </p>
                    </div>

                    <p>Log in to view the full assignment details and submit your work.</p>

                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This is an automated notification. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return subject, html_body

    @staticmethod
    def system_message(title: str, message: str) -> tuple[str, str]:
        """System message notification template.

        Args:
            title: Message title
            message: Message content

        Returns:
            Tuple of (subject, html_body)
        """
        subject = f"ℹ️ System notification: {title}"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>{title}</h2>

                    <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196f3;">
                        {message}
                    </div>

                    <p>If you have questions or concerns, please contact the system administrator.</p>

                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This is an automated notification. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return subject, html_body


class EmailNotificationService:
    """Service for sending email notifications."""

    @staticmethod
    def is_enabled() -> bool:
        """Check if email service is configured."""
        return bool(settings.SMTP_HOST and settings.SMTP_FROM and settings.SMTP_USER and settings.SMTP_PASSWORD)

    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """Send an email via SMTP.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: Email body in HTML format
            text_body: Email body in plain text (optional, defaults to HTML stripped)

        Returns:
            True if successful, False otherwise
        """
        if not EmailNotificationService.is_enabled():
            logger.warning("Email service not configured (SMTP_HOST not set)")
            return False

        # Type narrowing: is_enabled() ensures these are not None
        assert settings.SMTP_HOST is not None
        assert settings.SMTP_FROM is not None
        assert settings.SMTP_USER is not None
        assert settings.SMTP_PASSWORD is not None

        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to_email

            # Add plain text version
            if not text_body:
                text_body = html_body.replace("<br>", "\n").replace("</p>", "\n")
            msg.attach(MIMEText(text_body, "plain"))

            # Add HTML version
            msg.attach(MIMEText(html_body, "html"))

            # Send via SMTP
            smtp_port = getattr(settings, "SMTP_PORT", 587)
            use_tls = getattr(settings, "SMTP_USE_TLS", True)

            with smtplib.SMTP(settings.SMTP_HOST, smtp_port) as server:
                if use_tls:
                    server.starttls()

                # Authenticate with credentials
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
            return False

    @staticmethod
    async def send_grade_update(
        to_email: str,
        student_name: str,
        course_name: str,
        grade: float,
        max_grade: float,
    ) -> bool:
        """Send grade update email.

        Args:
            to_email: Recipient email
            student_name: Student's full name
            course_name: Course name
            grade: Grade received
            max_grade: Maximum possible grade

        Returns:
            True if successful
        """
        subject, html_body = EmailTemplates.grade_update(student_name, course_name, grade, max_grade)
        return EmailNotificationService.send_email(to_email, subject, html_body)

    @staticmethod
    async def send_attendance_change(
        to_email: str,
        student_name: str,
        course_name: str,
        status: str,
        date: str,
    ) -> bool:
        """Send attendance change email.

        Args:
            to_email: Recipient email
            student_name: Student's full name
            course_name: Course name
            status: Attendance status
            date: Date of class

        Returns:
            True if successful
        """
        subject, html_body = EmailTemplates.attendance_change(student_name, course_name, status, date)
        return EmailNotificationService.send_email(to_email, subject, html_body)

    @staticmethod
    async def send_course_announcement(
        to_email: str,
        course_name: str,
        title: str,
        message: str,
    ) -> bool:
        """Send course announcement email.

        Args:
            to_email: Recipient email
            course_name: Course name
            title: Announcement title
            message: Announcement message

        Returns:
            True if successful
        """
        subject, html_body = EmailTemplates.course_announcement(course_name, title, message)
        return EmailNotificationService.send_email(to_email, subject, html_body)

    @staticmethod
    async def send_assignment_posted(
        to_email: str,
        course_name: str,
        assignment_title: str,
        due_date: str,
    ) -> bool:
        """Send assignment posted email.

        Args:
            to_email: Recipient email
            course_name: Course name
            assignment_title: Assignment title
            due_date: Due date

        Returns:
            True if successful
        """
        subject, html_body = EmailTemplates.assignment_posted(course_name, assignment_title, due_date)
        return EmailNotificationService.send_email(to_email, subject, html_body)

    @staticmethod
    async def send_system_message(
        to_email: str,
        title: str,
        message: str,
    ) -> bool:
        """Send system message email.

        Args:
            to_email: Recipient email
            title: Message title
            message: Message content

        Returns:
            True if successful
        """
        subject, html_body = EmailTemplates.system_message(title, message)
        return EmailNotificationService.send_email(to_email, subject, html_body)
