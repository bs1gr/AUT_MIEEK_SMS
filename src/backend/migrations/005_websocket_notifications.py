"""
Database migration for WebSocket/notification support

Creates:
- Enhanced notification table with WebSocket metadata
- Notification preference table
- Email log table
"""

from alembic import op


# revision identifiers used by Alembic
revision = "005_websocket_notifications"
down_revision = None  # Will be set by Alembic
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade database schema"""

    # Create enhanced notification table if not exists
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'general',
            icon VARCHAR(100),
            action_url VARCHAR(500),
            read BOOLEAN DEFAULT FALSE,
            read_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id),
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at),
            INDEX idx_read (read),
            INDEX idx_deleted_at (deleted_at)
        )
        """
    )

    # Create notification preference table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS notification_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            email_notifications BOOLEAN DEFAULT TRUE,
            in_app_notifications BOOLEAN DEFAULT TRUE,
            digest_frequency VARCHAR(50) DEFAULT 'real-time',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            INDEX idx_user_id (user_id)
        )
        """
    )

    # Create email log table for tracking
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS email_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            notification_id INTEGER,
            subject VARCHAR(255),
            status VARCHAR(50) DEFAULT 'queued',
            sent_at DATETIME,
            failed_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (notification_id) REFERENCES notifications(id),
            INDEX idx_user_id (user_id),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        )
        """
    )


def downgrade() -> None:
    """Downgrade database schema"""

    # Drop tables in reverse order
    op.drop_table("email_logs", if_exists=True)
    op.drop_table("notification_preferences", if_exists=True)
    op.drop_table("notifications", if_exists=True)
