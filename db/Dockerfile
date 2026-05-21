FROM postgres:18.1

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-18-cron \
    postgresql-18-tds-fdw \
    freetds-dev \
    && rm -rf /var/lib/apt/lists/*

RUN echo "shared_preload_libraries = 'pg_cron'" >> /usr/share/postgresql/postgresql.conf.sample \
    && echo "cron.database_name = 'stage_base_crm'" >> /usr/share/postgresql/postgresql.conf.sample

COPY STAGEBASECRM.sql /docker-entrypoint-initdb.d/STAGEBASECRM.sql

EXPOSE 5432