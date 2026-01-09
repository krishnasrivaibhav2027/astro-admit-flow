-- Add subject column to results table
ALTER TABLE results ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'physics';

-- Update existing rows to have 'physics' as subject (though default handles new ones)
UPDATE results SET subject = 'physics' WHERE subject IS NULL;
