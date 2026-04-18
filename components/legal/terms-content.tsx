export function TermsContent() {
  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. Agreement</h2>
        <p className="text-muted">
          By creating an account or using Umutungo (&quot;Service&quot;), you agree to these Terms and our Privacy
          Policy. If you do not agree, do not use the Service. The operator may update these Terms; material changes
          should be communicated in-product or by email where available. Continued use after changes constitutes
          acceptance of the updated Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. What Umutungo is</h2>
        <p className="text-muted">
          Umutungo is a web application for landlords and asset teams to model <strong>properties and land</strong>,{" "}
          <strong>rentable units</strong>, <strong>tenants</strong>, <strong>leases</strong>,{" "}
          <strong>rent obligations</strong>, and <strong>payments</strong>; to view <strong>analytics</strong> and rent
          status; and to operate within <strong>plan limits</strong> (units, agents, features) attached to your
          subscription. A separate <strong>platform workspace</strong> exists for authorised administrators to manage
          plans, subscriptions, and catalog configuration.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. Accounts and roles</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <strong className="text-foreground">Owner</strong> accounts hold the portfolio and billing relationship with
            the operator.
          </li>
          <li>
            <strong className="text-foreground">Agent</strong> accounts may be invited by an owner with scoped access;
            agents act on behalf of that owner&apos;s data within permissions enforced by the Service.
          </li>
          <li>
            <strong className="text-foreground">Admin</strong> accounts are for internal or trusted operators only;
            they may access platform routes (plans, subscriptions, audit views) as implemented in the product.
          </li>
        </ul>
        <p className="text-muted">
          You are responsible for safeguarding credentials and for activity under your account. Notify the operator if
          you suspect unauthorised access.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">4. Acceptable use</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>No unlawful use, harassment, or attempts to probe or break security controls.</li>
          <li>No uploading of malware or content that infringes third-party rights.</li>
          <li>
            Payment <strong>proof attachments</strong> (where enabled) must relate to legitimate rent records you are
            authorised to manage.
          </li>
          <li>Respect plan limits; circumvention of technical enforcement is prohibited.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">5. Plans, subscriptions, and trials</h2>
        <p className="text-muted">
          Features and numeric limits (e.g. maximum units or agents) derive from your <strong>subscription</strong>{" "}
          and published <strong>plan versions</strong> in the catalog, plus any explicit <strong>entitlement grants</strong>{" "}
          configured by an administrator. Self-serve registration may include a <strong>checkout placeholder</strong>{" "}
          until a payment processor is integrated — you acknowledge that billing automation may not yet be active.
        </p>
        <p className="text-muted">
          Downgrades or plan changes may tighten limits for <strong>new</strong> actions; existing data is not
          automatically deleted solely because of a limit change (see product behaviour and operator guidance).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. Data you enter</h2>
        <p className="text-muted">
          You retain responsibility for the accuracy of names, amounts, dates, and documents you enter. The Service
          provides calculations and status views (including rent coverage and risk-style summaries) based on that data;
          it does not replace professional legal, tax, or accounting advice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">7. Intellectual property</h2>
        <p className="text-muted">
          The Service, its branding, and its software are owned by the operator or its licensors. You receive a limited,
          non-exclusive, non-transferable licence to use the Service for your internal portfolio operations during an
          active subscription or trial, subject to these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">8. Disclaimers</h2>
        <p className="text-muted">
          The Service is provided <strong>&quot;as is&quot;</strong> to the maximum extent permitted by law. The
          operator does not warrant uninterrupted or error-free operation. To the extent permitted by law, liability
          for indirect or consequential damages may be limited — your counsel should align this section with local law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">9. Suspension and termination</h2>
        <p className="text-muted">
          The operator may suspend access for security, abuse, or non-payment (when billing is enabled). You may stop
          using the Service at any time. Data retention and deletion are described in the Privacy Policy and may be
          refined as self-service account closure is implemented.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
        <p className="text-muted">
          For contractual notices or privacy requests, use the contact channel published by the operator (e.g. support
          email). If none is published, use the same channel you used to obtain access to the beta.
        </p>
      </section>
    </>
  );
}
