# Diamant Solutions Business Management Software core

This directory is the canonical product source for the shared Business Management Software UI and product configuration.

## Architecture

- Diamant Solutions owns the core product.
- M&J Metal is tenant #1 and a reference tenant, not the product master.
- Tenant-specific business data, branding, integrations and configuration must stay outside shared UI logic.
- Demo data must remain fictional and isolated from production tenant data and external writes.
- Changes to shared product UI are made here first, then synchronised into tenant deployments while the repositories remain separate.

## Transitional deployment

The current M&J deployment still contains a synchronised runtime copy of these components. Do not treat that runtime copy as the canonical source. The next migration stage is to make tenant builds consume this core directly so manual synchronisation can be removed.
