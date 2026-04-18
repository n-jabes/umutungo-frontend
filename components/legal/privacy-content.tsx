export function PrivacyContent() {
  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. Who we are</h2>
        <p className="text-muted">
          This Privacy Policy explains how Umutungo (&quot;we&quot;, &quot;us&quot;) processes personal and portfolio
          information when you use our web application and related APIs. The <strong>data controller</strong> is the
          business entity operating the deployment you signed up for (e.g. your SaaS vendor). For beta programmes, that
          is typically the company named on your invitation or contract.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. Categories of data</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <strong className="text-foreground">Account &amp; authentication:</strong> name, email and/or phone,
            password hash, role, session / refresh tokens, audit references, optional legal acceptance timestamp and
            bundle version.
          </li>
          <li>
            <strong className="text-foreground">Portfolio &amp; operations:</strong> assets, units, tenants, leases,
            rent obligations, payments, payment proof files (where uploaded), valuations, and notes you attach to
            records.
          </li>
          <li>
            <strong className="text-foreground">Subscriptions &amp; entitlements:</strong> plan keys, plan versions,
            subscription status, trial end dates (when used), billing window fields, entitlement grants, and
            subscription event logs for administrators.
          </li>
          <li>
            <strong className="text-foreground">Technical &amp; security:</strong> IP addresses and request metadata
            may appear in logs; error reporting (e.g. Sentry) may receive stack traces and route names when enabled.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. Purposes and legal bases (high level)</h2>
        <p className="text-muted">
          We process data to <strong>perform the contract</strong> with you (provide the Service, authenticate users,
          enforce plan limits, compute rent status), to <strong>secure the platform</strong>, and — where permitted — to{" "}
          <strong>improve reliability</strong> (e.g. diagnostics). Marketing communications, if any, should only be
          sent with appropriate consent under local law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">4. Retention</h2>
        <p className="text-muted">
          We retain data while your account is active and for a period afterwards as needed for backups, legal claims, or
          regulatory obligations. Exact retention windows should be set by the operator; self-service export and
          deletion flows may be added over time. Payment proof files are stored on infrastructure controlled by the
          operator with size and rate limits enforced by the application.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">5. Sharing</h2>
        <p className="text-muted">
          We use <strong>subprocessors</strong> typical for SaaS: e.g. cloud hosting (database, application), optional
          error tracking, and (when you enable it) transactional email. A current list should be maintained by the
          operator and linked from here when available. We do not sell your personal data as a product category.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. International transfers</h2>
        <p className="text-muted">
          Infrastructure may be located outside your country (e.g. EU cloud regions or US providers). Where required,
          the operator should implement appropriate safeguards (standard contractual clauses, etc.) — confirm with your
          counsel.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">7. Your rights</h2>
        <p className="text-muted">
          Depending on jurisdiction, you may have rights to access, rectify, erase, restrict, or port personal data, and
          to object to certain processing. Contact the operator to exercise these rights. We will verify your identity
          before acting on sensitive requests.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">8. Children</h2>
        <p className="text-muted">
          The Service is not directed at children. Do not register accounts for individuals below the age of digital
          consent in your region for commercial tenancy software.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">9. Changes</h2>
        <p className="text-muted">
          We may update this Policy. Material changes should be communicated as described in the Terms. Registration
          records which <strong>legal bundle version</strong> you accepted and when, to demonstrate consent for that
          version.
        </p>
      </section>
    </>
  );
}
