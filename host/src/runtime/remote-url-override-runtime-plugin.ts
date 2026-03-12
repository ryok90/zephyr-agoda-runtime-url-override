const REMOTE_DOMAIN = 'ze.zephyrcloud.app';

function rewriteRemoteEntryUrl(entryUrl: string, domain: string): string {
  try {
    // Parse and normalize for case-insensitive hostname checks.
    const parsedUrl = new URL(entryUrl);
    const normalizedDomain = domain.toLowerCase();
    const hostname = parsedUrl.hostname.toLowerCase();
    const [firstDomainLabel, ...restDomainLabels] = normalizedDomain.split('.');
    const restDomain = restDomainLabels.join('.');

    // Support both host styles:
    // 1) <slug>.<domain>
    // 2) <slug>-<first-domain-label>.<rest-domain>
    const candidateSuffixes = [`.${normalizedDomain}`];
    if (firstDomainLabel && restDomain) {
      candidateSuffixes.push(`-${firstDomainLabel}.${restDomain}`);
    }

    const matchedDomainSuffix = candidateSuffixes.find((suffix) => hostname.endsWith(suffix));

    // Only rewrite hosts that end with the configured domain.
    if (!matchedDomainSuffix) {
      return entryUrl;
    }

    // Extract the subdomain part as the remote slug.
    let remoteSlug = hostname.slice(0, -matchedDomainSuffix.length);
    const duplicatedLabelSuffixes = [`-${firstDomainLabel}`, `.${firstDomainLabel}`];

    // Handle duplicated trailing first-domain-label in the slug, e.g.:
    // - remote-ze.zephyrcloud.app -> remote
    // - remote.ze.zephyrcloud.app -> remote
    const matchedDuplicatedSuffix = duplicatedLabelSuffixes.find((suffix) => remoteSlug.endsWith(suffix));

    if (matchedDuplicatedSuffix) {
      remoteSlug = remoteSlug.slice(0, -matchedDuplicatedSuffix.length);
    }

    // Trim trailing separators left by the transformation.
    remoteSlug = remoteSlug.replace(/[-.]+$/, '');

    if (!remoteSlug) {
      return entryUrl;
    }

    // Rewrite to: https://<domain>/<remote-slug><original-path>
    const rewrittenUrl = new URL(entryUrl);
    rewrittenUrl.hostname = domain;
    rewrittenUrl.pathname = parsedUrl.pathname === '/' ? `/${remoteSlug}` : `/${remoteSlug}${parsedUrl.pathname}`;

    return rewrittenUrl.toString();
  } catch {
    return entryUrl;
  }
}

const remoteUrlOverrideRuntimePlugin = () => ({
  name: 'zz-remote-url-override-runtime-plugin',
  afterResolve(args: {
    remoteInfo?: {
      entry?: string;
    };
  }) {
    // Mutate resolved remote entry URL at runtime before remote loading continues.
    if (args.remoteInfo?.entry) {
      args.remoteInfo.entry = rewriteRemoteEntryUrl(args.remoteInfo.entry, REMOTE_DOMAIN);
    }

    return args;
  },
});

export default remoteUrlOverrideRuntimePlugin;
