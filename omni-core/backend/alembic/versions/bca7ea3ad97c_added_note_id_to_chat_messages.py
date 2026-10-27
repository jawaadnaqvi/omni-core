"""Added note_id to chat_messages

Revision ID: bca7ea3ad97c
Revises: b89110044ec0
Create Date: 2026-10-27 01:21:51.878097

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector # Ehtiyat ke tor par import karein


# revision identifiers, used by Alembic.
revision: str = 'bca7ea3ad97c'
down_revision: Union[str, Sequence[str], None] = 'b89110044ec0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Naya column add karein
    op.add_column('chat_messages', sa.Column('note_id', sa.Integer(), nullable=True))
    
    # Foreign key constraint ko proper naam dein
    op.create_foreign_key(
        'fk_chat_messages_note_id', # Constraint ka naam
        'chat_messages', 
        'notes', 
        ['note_id'], 
        ['id'], 
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Same naam use karein taake drop ho sake
    op.drop_constraint('fk_chat_messages_note_id', 'chat_messages', type_='foreignkey')
    op.drop_column('chat_messages', 'note_id')