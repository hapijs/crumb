# Reporting a security bug
All security bugs are taken seriously and should be reported by email to stongo@gmail.com.

Your email will be acknowledged within 24 hours, and you’ll receive a more  detailed response to your email within 48 hours indicating the next steps in handling your report.

After the initial reply to your report, the security team will endeavor to keep you informed of the progress being made towards a fix and full announcement, and may ask for  additional information or guidance surrounding the reported issue. These updates will be sent at least every five days, in practice, this is more likely to be every 24-48 hours.

If you have not received a reply to your email within 48 hours, or have not heard from the security team for the  past five days, there are a few steps you can take:

- Email [Marcus Stong](mailto:stongo@gmail.com)
- Give the hapi contributors a heads up on IRC in #hapi on irc.freenode.net

Thank you for taking the time to disclose the issue to us. Your efforts and responsible disclosure are greatly appreciated!

# Disclosure Policy

The security report is received and is assigned a primary handler. This person will coordinate the fix and release process.

The problem is confirmed. Code is audited to find any potential similar problems.

Fixes are prepared. These fixes are not committed to the public repository but rather held locally pending the announcement.

This process can take some time, especially when coordination is required with maintainers of other projects. Every effort will be made to handle the bug in as timely a manner as possible.

A blog post about the issue will be published, customers notified and attribution to the finder given.

# Comments on this Policy
Can you help make this policy / process better? Please email stongo@gmail.com with your comments.

# History

* When CORS set to true and Origin request header exists, it could lead to a crumb cookie being set on a different domain. Fixed in version 3.0.0. Attributed to Marcus Stong and Tom Steele.

# Credits

Thanks to Adam Baldwin for explaining the importance of a SECURITY.md file:
https://blog.liftsecurity.io/2013/06/02/security-md-improved-security-disclosure
