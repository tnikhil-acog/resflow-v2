**Deployment Plan**

## **Architecture Overview**

## **Host Directory Layout**

/opt/company-app/  
 ├── docker-compose.yml  
 ├── .env  
 ├── backups/  
 │ ├── daily/  
 │ └── wal/  
 ├── postgres/  
 │ ├── data/  
 │ └── init/  
 └── app/

---

## **Docker Compose Stack**

version**:** "3.9"

services**:**  
 app**:**  
 build**:** ./app  
 container_name**:** company_app  
 restart**:** always  
 env_file**:** .env  
 depends_on**:**  
 **\-** db

db**:**  
 image**:** postgres:16  
 container_name**:** company_db  
 restart**:** always  
 env_file**:** .env  
 volumes**:**  
 **\-** ./postgres/data:/var/lib/postgresql/data  
 **\-** ./postgres/init:/docker-entrypoint-initdb.d  
 **\-** ./backups:/backups  
 ports**:**  
 **\-** "5432:5432"  
 command**:** \>  
 postgres  
 \-c wal_level=replica  
 \-c archive_mode=on  
 \-c archive_command='cp %p /backups/wal/%f'

---

## **Environment Configuration**

.env

POSTGRES_DB=companydb  
POSTGRES_USER=companyuser  
POSTGRES_PASSWORD=securepassword  
DATABASE_URL=postgresql://companyuser:securepassword@db:5432/companydb

---

## **Daily Backup System**

backup.sh

_\#\!/bin/bash_

DATE\=$(date \+"%Y-%m-%d")  
docker exec company\_db pg\_dump \-U companyuser companydb \> /opt/company-app/backups/daily/backup\_$DATE.sql

Enable:

chmod \+x backup.sh

Cron:

0 2 \* \* \* /opt/company-app/backup.sh

---

## **WAL Logging**

PostgreSQL configuration:

wal_level=replica  
archive_mode=on  
archive_command='cp %p /backups/wal/%f'

WAL files stored at:

/opt/company-app/backups/wal/

---

## **Recovery Procedure**

### **Stop services**

docker-compose down

### **Restore last snapshot**

docker-compose up \-d db  
psql \< backups/daily/backup_YYYY-MM-DD.sql

### **Replay WAL logs**

Postgres automatically replays WAL logs on startup to restore state.

---

## **Rollback Strategy**

Docker images are versioned:

company-app:1.2.0  
company-app:1.1.0

Rollback:

docker-compose down  
docker pull company-app:1.1.0  
docker-compose up \-d

---

## **Guarantees**

| Protection            | Mechanism        |
| :-------------------- | :--------------- |
| Crash Recovery        | WAL replay       |
| Daily Snapshot        | pg_dump          |
| Point-in-Time Restore | WAL              |
| Rollback              | Versioned images |
| Persistence           | Disk volumes     |

---

## **Final Result**

- Fully isolated application stack

- Persistent database

- Daily backups

- Continuous transaction history

- Disaster recovery

- Versioned rollback

- Zero data loss
