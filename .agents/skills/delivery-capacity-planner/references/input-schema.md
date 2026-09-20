# Input schema

Map source columns flexibly; do not require exact names.

## Demand fields
- demand_id / project / workstream
- project_description
- role / profile
- primary_skill / technology
- secondary_skills
- seniority
- quantity
- requested_start_date
- duration / end_date
- geo / country / region
- timezone_requirement
- language_requirement
- allocation_percent
- mandatory_location (yes/no)
- mandatory_seniority (yes/no)
- client_facing (yes/no)
- priority
- notes / constraints

Minimum usable sourcing row: role or skill + quantity. Dates, seniority, and geo may be unknown but must be surfaced as assumptions.
