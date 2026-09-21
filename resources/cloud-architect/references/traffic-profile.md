# Traffic Profiles

You have different traffic profiles, match the solution with the type of solutions that matches best and then create a table with what things would need to be changed for each traffic profile.

## Websites Traffic Profiles

### Traffic Profiles

| Profile | Monthly Visitors | Concurrent Users |
| --- | --- | --- |
| Low Traffic | Roughly 1000 to 15000 monthly visitors. | Typically less than 10 to 50 at any given time (Concurrent Users). |
| Mid Traffic | Roughly 15000 to 250000 monthly visitors. | Approximately 100 to 500 concurrent users. |
| High Traffic | Over 250000 monthly visitors. | Concurrent Users reaching 1000+ |

### Notes

- **Caching:** Active caching allows a standard 4-core server to handle up to 600 concurrent users for browsing, but that capacity drops sharply when users are actively submitting data (e.g., in a checkout line).
- **Calculation Method:** A common formula to determine capacity is: `(Peak Hourly Sessions × Average Session Duration in seconds) / 3600`

## APIs & WebServices Traffic Profiles

| Profile | Requests Per Second | Monthly Volume |
| --- | --- | --- |
| Low Traffic | `<50` | `< 1M requests` |
| Mid Traffic | `50 to 1000` | `1M to 50M requests` |
| High Traffic | `between above 1000` | `above 50M requests` |

### Notes

- **Note:** A single server can often handle much higher "concurrency" for a web service than a website because API calls are typically data-only (JSON/XML) and don't require rendering heavy HTML or images.
- **Standard API Quotas:** Services like Google Analytics often set default limits around 10 QPS per IP to prevent abuse. Check this for all the services being used.
- **Cloud Gateways:** Default account-level limits on platforms like AWS API Gateway are typically capped at 10,000 RPS.
- **Bottlenecks:** Even if your web service is fast, its concurrency is often limited by its database connections.
- **Server Capacity:** A well-optimized 8-CPU machine in 2026 can sustain 4,000 to 6,000 RPS for standard logic.
- **The "User" Gap:** Because of "think time" (users reading before clicking again), 1,000 concurrent website users might only generate 50–100 active HTTP requests at any single millisecond.

## Database Traffic Profiles

| Profile | Queries Per Second | Concurrent Connections |
| --- | --- | --- |
| Low Traffic | `<100` | `< 50` |
| Mid Traffic | `100 to 1000` | `50 to 300` |
| High Traffic | `1000 to 25000` | `300 to 1000` |
| Very Large Traffic | `25000 to 100000` | `> 50` |

### Notes

- **Note:** Because one user action on a website (like loading a profile) can trigger 80 or more database queries, database traffic is often much higher than the web traffic it supports.
- **Latency:** user-facing queries should return in under 100ms.
- **Capacity Formula:** A rough rule for sizing is `QPS ≈ (1 / Avg Query Time) × CPU Cores`. For example, if your queries take 50ms, 16 cores can handle roughly 320 QPS.
- **The "Wall" at 1,000 QPS:** For many teams, 1,000 QPS is where a single vertical instance begins to hit hardware limits, often forcing a move to more complex architectures.
- Database performance often peaks around 300 to 500 concurrent connections. Going beyond 1,000 simultaneous connections can actually slow down the system due to CPU context switching.
- **Read vs. Write Ratio:** Most production workloads are read-heavy (e.g., a 10:1 ratio). A database can often handle 25,000+ QPS if the traffic is primarily simple reads from memory.

## Data Streaming Traffic Profiles

| Profile | Throughput | Events Per Second | Typical Use |
| --- | --- | --- | --- |
| Low Traffic | `<10MB/s` | `< 5000` | Usually enough for SD streaming |
| Mid Traffic | `10MB/s to 100MB/s` | `5000 to 100000` | Typically required for HD streaming |
| High Traffic | `100MB/s to 1000MB/s` | `100000 to 1000000` | Typically required for Gaming applications and Ultra HD streaming |
| Very Large Traffic | `> 1000MB/s` | `> 1000000` | Typically required for Gaming applications and Ultra HD streaming |

### Notes

- **Ingestion Latency:** How quickly data is queryable after being produced should be between 10–50ms end-to-end.

## IoT/Sensor Traffic Profiles

| Profile | Total Devices Connected | Messages Per Second | Data Volume |
| --- | --- | --- | --- |
| Low Traffic | `<1000` | `< 100` | `< 10Mb per month per device` |
| Mid Traffic | `1000 to 100000` | `100 to 5000` | `50Mb to 500Mb per month per device` |
| High Traffic | `100000 to 1000000` | `5000 to 1000000` | `500Mb to 1000Mb per month per device` |

### Notes

- **Message Size:** A "large" traffic IoT solution might actually use very little bandwidth if it sends tiny MQTT packets (under 1KB), but it requires high Connection Management capacity to handle millions of simultaneous pings.
- **The "Edge" Shift:** In 2026, many high-traffic IoT systems use Edge AI to process data locally. This means a "Large" system might only send critical alerts (low external traffic) while processing terabytes of data locally.
- **Device Management:** Scaling to "Large" traffic (over 100,000 devices) often requires specialized Connectivity Management Platforms (like those from Cisco or Verizon) to handle authentication and OTA (Over-The-Air) updates without crashing the network.
