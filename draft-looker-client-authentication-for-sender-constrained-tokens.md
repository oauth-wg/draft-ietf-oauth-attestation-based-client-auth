---
###
# Internet-Draft Markdown Template
#
# Rename this file from draft-todo-yourname-protocol.md to get started.
# Draft name format is "draft-<yourname>-<workgroup>-<name>.md".
#
# For initial setup, you only need to edit the first block of fields.
# Only "title" needs to be changed; delete "abbrev" if your title is short.
# Any other content can be edited, but be careful not to introduce errors.
# Some fields will be set automatically during setup if they are unchanged.
#
# Don't include "-00" or "-latest" in the filename.
# Labels in the form draft-<yourname>-<workgroup>-<name>-latest are used by
# the tools to refer to the current version; see "docname" for example.
#
# This template uses kramdown-rfc: https://github.com/cabo/kramdown-rfc
# You can replace the entire file if you prefer a different format.
# Change the file extension to match the format (.xml for XML, etc...)
#
###
title: "OAuth2 Client Authentication for Sender Constrained Tokens"
category: info

docname: draft-looker-client-authentication-for-sender-constrained-tokens-latest
submissiontype: IETF  # also: "independent", "IAB", or "IRTF"
number:
date:
v: 3
area: AREA
workgroup: WG Working Group
venue:
  group: WG
  type: Working Group

author:
 -
    fullname: Tobias Looker
    organization: MATTR
    email: tobias.looker@mattr.global

normative:

informative:


--- abstract

This specification defines a new client attestation type following [RFC7523] for client authentication when issuing sender constrained tokens. This new attestion type allows the authorization server to authenticate the client including the key that will be used to bind sender constrained tokens to.

--- middle

# Introduction

[RFC7523] defines a way for a client to include an attestation in a token request to an authorization server for the purposes of client authentication. However, in the event the client is requesting sender constrained tokens using a mechansim such as [DPoP], it is useful to be able to confirm that the key the authorization server is going to bind the sender constrained tokens to, is authenticated by the client. This specification defines an attestation type to fulfil this purpose.

# Conventions and Definitions

{::boilerplate bcp14-tagged}

# Client Authentication in the Token Request

To use a JWT Bearer Token for client authentication and conveyance of the key to be used for sender constraining the tokens issued by the authorization server, the client uses the following parameter values and encodings.

The value of the "client_assertion_type" is "urn:ietf:params:oauth:client-assertion-type:jwt-bearer-for-sender-constraint".

The value of the "client_assertion" parameter contains a single JWT. It MUST NOT contain more than one JWT. The format of this JWT MUST follow the rules defined in (#....).

The following example demonstrates client authentication using a JWT during the presentation of an authorization code grant in an access token request (with extra line breaks for display purposes only):

POST /token.oauth2 HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=n0esc3NRze7LTCu7iYzS6a5acc3f0ogp4&
client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3A
client-assertion-type%3Ajwt-bearer-for-sender-constraint&
client_assertion=eyJhbGciOiJSUzI1NiIsImtpZCI6IjIyIn0.
eyJpc3Mi[...omitted for brevity...].
cC4hiUPo[...omitted for brevity...]

## JWT Format and Processing Requirements

In order to issue an access token response as described in OAuth 2.0 [@RFC6749] or to rely on a JWT for client authentication, the authorization server MUST validate the JWT according to the criteria below.  Application of additional restrictions and policy are at the discretion of the authorization server.

1. The JWT MUST contain an "iss" (issuer) claim that contains a unique identifier for the entity that issued the JWT. In the absence of an application profile specifying otherwise, compliant applications MUST compare issuer values using the Simple String Comparison method defined in Section 6.2.1 of RFC 3986 [@RFC3986].

2. The JWT MUST contain a "sub" (subject) claim with a value corresponding to the "client_id" of the OAuth client.

3. The JWT MUST contain an "aud" (audience) claim containing a value that identifies the authorization server as an intended audience.  The token endpoint URL of the authorization server MAY be used as a value for an "aud" element to identify the authorization server as an intended audience of the JWT.  The authorization server MUST reject any JWT that does not contain its own identity as the intended audience.  In the absence of an application profile specifying otherwise, compliant applications MUST compare the audience values using the Simple String Comparison method defined in Section 6.2.1 of RFC 3986 [@RFC3986].  As noted in Section 5, the precise strings to be used as the audience for a given authorization server must be configured out of band by the authorization server and the issuer of the JWT.

4. The JWT MUST contain an "exp" (expiration time) claim that limits the time window during which the JWT can be used.  The authorization server MUST reject any JWT with an expiration time that has passed, subject to allowable clock skew between systems.  Note that the authorization server may reject JWTs with an "exp" claim value that is unreasonably far in the future.

5. The JWT MUST contain an "cnf" claim conforming to RFC 7800 [@RFC7800] that conveys the key to be used for sender constraining tokens issued by the authorization server.

5. The JWT MAY contain an "nbf" (not before) claim that identifies the time before which the token MUST NOT be accepted for processing.

6. The JWT MAY contain an "iat" (issued at) claim that identifies the time at which the JWT was issued.  Note that the authorization server may reject JWTs with an "iat" claim value that is unreasonably far in the past.

7. The JWT MAY contain a "jti" (JWT ID) claim that provides a unique identifier for the token.  The authorization server MAY ensure that JWTs are not replayed by maintaining the set of used "jti" values for the length of time for which the JWT would be considered valid based on the applicable "exp" instant.

8. The JWT MAY contain other claims.

9. The JWT MUST be digitally signed or have a Message Authentication Code (MAC) applied by the issuer.  The authorization server MUST reject JWTs with an invalid signature or MAC.

10. The authorization server MUST reject a JWT that is not valid in all other respects per "JSON Web Token (JWT)".

The following example is the decoded header and payload of a JWT meeting the processing rules as defined above.

{
  "alg": "ES256",
  "kid": "11"
}
.
{
  "iss": "https://client.example.com",
  "sub": "https://client.example.com",
  "aud": "https://as.example.com",
  "nbf":1300815780,
  "exp":1300819380,
  "cnf": {
    "jwk": {
      "kty": "EC",
      "use": "sig",
      "crv": "P-256",
      "x": "18wHLeIgW9wVN6VD1Txgpqy2LszYkMf6J8njVAibvhM",
      "y": "-V4dS4UaLMgP_4fY4j8ir7cl1TXlFdAgcx55o7TkcSA"
    }
  }
}

# Considerations for usage with DPoP

An authorization server MUST validate that the key contained withing the "cnf" claim of the JWT in the "client_assertion" parameter of the token request matches the key present in the "jwk" claim of the header for the DPoP Proof JWT. It is RECOMMENDED to do this equality check that the authorization server compute the JWK thumbprint of these two keys, as defined in [@RFC7638].

The following is a non-normative example of a token request making use of the "client_assertion_type" of "urn:ietf:params:oauth:client-assertion-type:jwt-bearer-for-sender-constraint" in conjunction with [DPoP].

POST /token HTTP/1.1
Host: server.example.com
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6Ik\
 VDIiwieCI6Imw4dEZyaHgtMzR0VjNoUklDUkRZOXpDa0RscEJoRjQyVVFVZldWQVdCR\
 nMiLCJ5IjoiOVZFNGpmX09rX282NHpiVFRsY3VOSmFqSG10NnY5VERWclUwQ2R2R1JE\
 QSIsImNydiI6IlAtMjU2In19.eyJqdGkiOiItQndDM0VTYzZhY2MybFRjIiwiaHRtIj\
 oiUE9TVCIsImh0dSI6Imh0dHBzOi8vc2VydmVyLmV4YW1wbGUuY29tL3Rva2VuIiwia\
 WF0IjoxNTYyMjYyNjE2fQ.2-GxA6T8lP4vfrg8v-FdWP0A0zdrj8igiMLvqRMUvwnQg\
 4PtFLbdLXiOSsX0x7NVY-FNyJK70nfbV37xRZT3Lg

grant_type=authorization_code\
&client_id=s6BhdRkqt\
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb\
&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3A
&client-assertion-type%3Ajwt-bearer-for-sender-constraint
client_assertion=eyJhbGciOiJSUzI1NiIsImtpZCI6IjIyIn0.
eyJpc3Mi[...omitted for brevity...].
cC4hiUPo[...omitted for brevity...]

<TODO elaborate on decoded JWTs>

# Security Considerations

TODO Security


# IANA Considerations

This document has no IANA actions.


--- back

# Acknowledgments
{:numbered="false"}

TODO acknowledge.
