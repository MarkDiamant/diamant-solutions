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

## Product default and tenant customisation policy

- Every requested feature, bug fix, workflow, Ruby improvement, quote editor change and PDF correction belongs in the canonical BMS core first. M&J is the first tenant and uses these defaults, not a separate product.
- Current M&J workflow preferences are the BMS defaults until product requirements change. Never hardcode metalwork-specific language, sample data, prices or contact details in shared logic.
- Tenant configuration controls identity, branding, industry wording, permissions and explicitly approved exceptions. New tenants inherit core defaults automatically.
- Demo tenants run the same shared features but retain their own fictional and isolated data. Never expose real tenant records or credentials in demos.
- While tenant runtime components remain copied into separate repositories, synchronise each core change into those runtime copies and verify both builds. A successful core-site build alone does not prove tenant integration.
- Prefer eliminating runtime copies through shared-package imports in a future migration; do not claim that migration is complete until tenant apps actually import the shared code.
