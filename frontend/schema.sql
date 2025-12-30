-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Printers Table
create table if not exists printers (
  id uuid primary key default uuid_generate_v4(),
  model_name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sections Table (Hierarchical)
create table if not exists sections (
  id uuid primary key default uuid_generate_v4(),
  printer_id uuid references printers(id) on delete cascade not null,
  name text not null,
  parent_section_id uuid references sections(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Spare Parts Table
create table if not exists spare_parts (
  id uuid primary key default uuid_generate_v4(),
  oem_code text not null unique,
  description text not null,
  image_url text, -- Store URL to image
  ranking integer check (ranking >= 1 and ranking <= 5) default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Section Parts Link Table (Many-to-Many)
create table if not exists section_parts (
  section_id uuid references sections(id) on delete cascade not null,
  part_id uuid references spare_parts(id) on delete cascade not null,
  primary key (section_id, part_id)
);

-- Error Codes Table
create table if not exists error_codes (
  id uuid primary key default uuid_generate_v4(),
  printer_id uuid references printers(id) on delete cascade not null,
  code text not null,
  classification text,
  cause text,
  measures text,
  solution text,
  estimated_abnormal_parts text,
  correction text,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(printer_id, code)
);

-- Error Parts Link Table (Many-to-Many with Ranking specific to error)
create table if not exists error_parts (
  error_id uuid references error_codes(id) on delete cascade not null,
  part_id uuid references spare_parts(id) on delete cascade not null,
  ranking integer check (ranking >= 1 and ranking <= 5) default 5, -- High importance for error fixes
  primary key (error_id, part_id)
);

-- Create indexes for faster search
create index if not exists idx_error_codes_code on error_codes(code);
create index if not exists idx_error_codes_printer_id on error_codes(printer_id);
create index if not exists idx_section_parts_section_id on section_parts(section_id);
