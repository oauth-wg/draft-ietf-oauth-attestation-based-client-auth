---
title: "OAuth 2.0 Attestation-Based Client Authentication"
category: std
lang: en

docname: draft-ietf-oauth-attestation-based-client-auth-latest
submissiontype: IETF  # also: "IETF", "IAB", or "IRTF"
area: "Security"
workgroup: "Web Authorization Protocol"
ipr: trust200902

number:
date:
v: 3
venue:
  group: "Web Authorization Protocol"
  type: "Working Group"
  mail: "oauth@ietf.org"
  arch: "https://mailarchive.ietf.org/arch/browse/oauth/"
  github: "oauth-wg/draft-ietf-oauth-attestation-based-client-auth"
  latest: "https://oauth-wg.github.io/draft-ietf-oauth-attestation-based-client-auth/draft-ietf-oauth-attestation-based-client-auth.html"

author:
 -
    fullname: Tobias Looker
    organization: MATTR
    email: tobias.looker@mattr.global
 -
    fullname: Paul Bastian
    organization: Bundesdruckerei
    email: paul.bastian@bdr.de
 -
    fullname: Christian Bormann
    organization: SPRIND
    email: chris.bormann@gmx.de


normative:
  RFC3986: RFC3986
  RFC6750: RFC6750
  RFC7591: RFC7591
  RFC7519: RFC7519
  RFC7800: RFC7800
  RFC8414: RFC8414
  RFC8725: RFC8725
  RFC9110: RFC9110
  RFC9112: RFC9112
  RFC9126: RFC9126
  RFC9449: RFC9449
  IANA.HTTP.Fields:
    author:
      org: "IANA"
    title: "Hypertext Transfer Protocol (HTTP) Field Name Registry"
    target: "https://www.iana.org/assignments/http-fields/http-fields.xhtml"
  IANA.OAuth.Params:
    author:
      org: "IANA"
    title: "OAuth Authorization Server Metadata"
    target: "https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#authorization-server-metadata"
  IANA.JOSE.ALGS:
    author:
      org: "IANA"
    title: "JSON Web Signature and Encryption Algorithms"
    target: "https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms"

informative:
  RFC6749: RFC6749
  RFC9334: RFC9334
  RFC7523: RFC7523
  RFC9901: RFC9901
  ARF:
    title: "The European Digital Identity Wallet Architecture and Reference Framework"

--- abstract

This specification defines an extension to the OAuth 2.0 protocol {{RFC6749}} that enables a client instance to include a key-bound attestation when interacting with an Authorization Server or Resource Server. This mechanism allows a client instance to prove its authenticity verified by a client attester without revealing its target audience to that attester. It may also serve as a mechanism for client authentication as per OAuth 2.0.

--- middle

# Introduction

Traditional OAuth security concepts perform client authentication through a backend channel. In ecosystems such as the Issuer-Holder-Verifier model used in {{RFC9901}}, this model raises privacy concerns, as it would enable the backend to recognize which Holder (i.e. client) interacts with which Issuer (i.e. Authorization Server) and potentially furthermore see the credentials being issued. This specification establishes a mechanism for a backend-attested client authentication through a frontend channel to address these issues.

Additionally, this approach acknowledges the evolving landscape of OAuth 2 deployments, where the ability for mobile native apps to authenticate securely and reliably has become increasingly important. Leveraging platform mechanisms to validate a client instance, such as mobile native apps, enables secure authentication that would otherwise be difficult with traditional OAuth client authentication methods. Transforming these platform-specific mechanisms into a common format as described in this specification abstracts this complexity to minimize the efforts for the Authorization Server.

This primary purpose of this specification is the authentication of a client instance enabled through the client backend attesting to it. The client backend may also attest further technical properties about the hardware and software of the client instance.

The client is considered a confidential OAuth 2 client type according to section 2.1 of {{RFC6749}}. The mechanism described in this document may  either serve as a standalone OAuth 2 client authentication mechanism or as an additional, supportive security mechanism beside an existing OAuth 2 client authentication mechanism.

This specification introduces the concept of client attestations to the OAuth 2 protocol, using two artifacts:

- a Client Attestation, a signed statement by the Client Attester that authenticates the Client Instance
- a Proof of Possession (PoP), a signed statement by the Client Instance that authenticates the Client Attestation

The following diagram depicts the overall architecture and protocol flow.

~~~ ascii-art
                    (3)
                 +-------+
                 |       |
                 |      \ /
             +--------------------+
             |                    |
             |    Client Attester |
             |      (backend)     |
             |                    |
             +--------------------+
                / \      |
            (2)  |       |  (4)
                 |      \ /
             +---------------+           +---------------+
      +----->|               |           |               |
  (1) |      |    Client     |    (6)    | Authorization |
      |      |   Instance    |<--------->|    Server     |
      +------|               |           |               |
             +---------------+           +---------------+
                / \      |
                 |       |
                 +-------+
                    (5)

~~~

The following steps describe this OAuth flow:

(1) The Client Instance generates a key (Client Instance Key) and optional further attestations (that are out of scope) to prove its authenticity to the Client Attester.

(2) The Client Instance sends this data to the Client Attester in request for a Client Attestation JWT.

(3) The Client Attester validates the Client Instance Key and optional further data. It generates a signed Client Attestation JWT that is cryptographically bound to the Client Instance Key generated by the Client. Therefore, the attestation is bound to this particular Client Instance.

(4) The Client Attester responds to the Client Instance by sending the Client Attestation JWT.

(5) The Client Instance generates a Proof of Possession (PoP) with the Client Instance Key.

(6) The Client Instance sends both the Client Attestation JWT and the Client Attestation PoP JWT to the authorization server, e.g. within a token request. The authorization server validates the Client Attestation and thus authenticates the Client Instance.

Please note that the protocol details for steps (2) and (4), particularly how the Client Instance authenticates to the Client Attester, are beyond the scope of this specification. Furthermore, this specification is designed to be flexible and can be implemented even in scenarios where the client does not have a backend serving as a Client Attester. In such cases, each Client Instance is responsible for performing the functions typically handled by the Client Attester on its own.

# Conventions and Definitions

{::boilerplate bcp14-tagged}

# Terminology {#terminology}

Client Attestation JWT:
:  A JSON Web Token (JWT) generated by the Client Attester which is bound to a key managed by a Client Instance which can then be used by the instance for client authentication.

Client Attestation Proof of Possession (PoP) JWT:
:  A Proof of Possession generated by the Client Instance using the key that the Client Attestation JWT is bound to.

Client Instance:
: A deployed instance of a piece of client software.

Client Instance Key:
:  A cryptographic asymmetric key pair that is generated by the Client Instance where the public key of the key pair is provided to the Client Attester. This public key is then encapsulated within the Client Attestation JWT and is utilized to sign the Client Attestation Proof of Possession.

Client Attester:
: An entity that authenticates a Client Instance and attests it by issuing a Client Attestation JWT.

Challenge:
: A String that is the input to a cryptographic challenge-response pattern. This is traditionally called a nonce within OAuth.

# Client Attestation JWT {#client-attestation-jwt}

The Client Attestation MUST be encoded as a "JSON Web Token (JWT)" according to {{RFC7519}}.

The following content applies to the JWT Header:

* `typ`: REQUIRED. The JWT type MUST be `oauth-client-attestation+jwt`.

The following content applies to the JWT Claims Set:

* `sub`: REQUIRED. The `sub` (subject) claim MUST specify client_id value of the OAuth Client.
* `exp`: REQUIRED. The `exp` (expiration time) claim MUST specify the time at which the Client Attestation is considered expired by its issuer. The authorization server MUST reject any JWT with an expiration time that has passed, subject to allowable clock skew between systems.
* `cnf`: REQUIRED. The `cnf` (confirmation) claim MUST specify a key conforming to {{RFC7800}} that is used by the Client Instance to generate the Client Attestation PoP JWT for client authentication with an authorization server. The key MUST be expressed using the "jwk" representation.
* `iat`: OPTIONAL. The `iat` (issued at) claim MUST specify the time at which the Client Attestation was issued.

The following additional rules apply:

1. The JWT MAY contain other claims. All claims that are not understood by implementations MUST be ignored.

2. The JWT MUST be digitally signed or integrity protected with a Message Authentication Code (MAC). The authorization server MUST reject JWTs if signature or integrity protection validation fails.

3. The authorization server MUST reject a JWT that is not valid in all other respects per "JSON Web Token (JWT)" {{RFC7519}}.

The following example is the decoded header and payload of a JWT meeting the processing rules as defined above.

~~~
{::include examples/client-attestation-header.md}
.
{::include examples/client-attestation-payload.md}
~~~

When using headers to transfer the Client Attestation JWT to an Authorization Server or Resource Server, it MUST be provided in an HTTP request using the a HTTP header named `OAuth-Client-Attestation`.

The following is an example of the OAuth-Client-Attestation header.

~~~
OAuth-Client-Attestation: eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRpb24
rand0IiwiYWxnIjoiRVMyNTYiLCJraWQiOiIxMSJ9.eyJzdWIiOiJodHRwczovL2NsaWV
udC5leGFtcGxlLmNvbSIsImlhdCI6MTc3MjQ4NzU5NSwiZXhwIjoyNTI5ODY2Mzk0LCJj
bmYiOnsiandrIjp7Imt0eSI6IkVDIiwidXNlIjoic2lnIiwiY3J2IjoiUC0yNTYiLCJ4I
joiVmNLVk5CWjRJYUJBWVczanhNNHczVEpGVkE3bXllVUdReUd0LWdfeXZwUSIsInkiOi
JmLUUtaFlFM1RBV0t3aFZ2OXBlajlOQUJzOVNYOVhzTk84MHg1N2pGVHlVIn19fQ._TS4
d-LAnRlwdN97wiVnl4z7C9gvm45IWr-BvGTzeZaHtZtgNZ88gvzroU3LElUPbgF4kWi_D
FORnKzsx5yu6A
~~~

Note that per {{RFC9110}} header field names are case-insensitive; so OAUTH-CLIENT-ATTESTATION, oauth-client-attestation, etc., are all valid and equivalent
header field names. Case is significant in the header field value, however.

The OAuth-Client-Attestation HTTP header field values uses the token68 syntax defined in Section 11.2 of {{RFC9110}} (repeated below for ease of reference).

~~~
OAuth-Client-Attestation       = token68
token68                        = 1*( ALPHA / DIGIT / "-" / "." /
                                     "_" / "~" / "+" / "/" ) *"="
~~~

# Proof of Possession

This specification enables two options for the proof of possession:

- A Client Attestation PoP JWT, introduced by this specification
- utilizing DPoP as defined in {{RFC9449}}

## Client Attestation PoP JWT {#client-attestation-pop-jwt}

The Client Attestation PoP MUST be encoded as a "JSON Web Token (JWT)" according to {{RFC7519}}.

The following content applies to the JWT Header:

* `typ`: REQUIRED. The JWT type MUST be `oauth-client-attestation-pop+jwt`.

The following content applies to the JWT Claims Set:

* `aud`: REQUIRED. The `aud` (audience) claim MUST specify a value that identifies the authorization server as an intended audience. The {{RFC8414}} issuer identifier URL of the authorization server MUST be used as a value for an "aud" element to identify the authorization server as the intended audience of the JWT.
* `jti`: REQUIRED. The `jti` (JWT identifier) claim MUST specify a unique identifier for the Client Attestation PoP. The authorization server can utilize the `jti` value for replay attack detection, see [](#security-consideration-replay).
* `iat`: REQUIRED. The `iat` (issued at) claim MUST specify the time at which the Client Attestation PoP was issued. Note that the authorization server may reject JWTs with an "iat" claim value that is unreasonably far in the past.
* `challenge`: OPTIONAL. The `challenge` (challenge) claim MUST specify a String value that is provided by the authorization server for the client to include in the Client Attestation PoP JWT.

The following additional rules apply:

1. The JWT MAY contain other claims. All claims that are not understood by implementations MUST be ignored.

2. The JWT MUST be digitally signed using an asymmetric cryptographic algorithm. The authorization server MUST reject JWTs with an invalid signature.

3. The public key used to verify the JWT MUST be the key located in the "cnf" claim of the corresponding Client Attestation JWT.

4. The Authorization Server MUST reject a JWT that is not valid in all other respects per "JSON Web Token (JWT)" {{RFC7519}}.

The following example is the decoded header and payload of a JWT meeting the processing rules as defined above.

~~~
{::include examples/client-pop-header.md}
.
{::include examples/client-pop-challenge-payload.md}
~~~

When using headers to transfer the Client Attestation PoP JWT to an Authorization Server or Resource Server, it MUST be provided in an HTTP request using the a HTTP header named `OAuth-Client-Attestation-PoP`.

The following is an example of the OAuth-Client-Attestation-PoP header.

~~~
{::include examples/client-pop-http.md}
~~~

Note that per {{RFC9110}} header field names are case-insensitive; so OAUTH-CLIENT-ATTESTATION-POP, oauth-client-attestation-pop, etc., are all valid and equivalent
header field names. Case is significant in the header field value, however.

The OAuth-Client-Attestation-PoP HTTP header field values uses the token68 syntax defined in Section 11.2 of {{RFC9110}} (repeated below for ease of reference).

~~~
OAuth-Client-Attestation-PoP   = token68
token68                        = 1*( ALPHA / DIGIT / "-" / "." /
                                     "_" / "~" / "+" / "/" ) *"="
~~~

## DPoP

todo

# Challenge Retrieval {#challenge-retrieval}

This section defines an optional mechanism that allows a Client to request a fresh Challenge from the Authorization Server to be included in the Client Attestation PoP JWT. This construct may be similar or equivalent to a nonce, see [](#terminology). The value of the challenge is opaque to the client.

An Authorization Server MAY offer a challenge endpoint for Clients to fetch Challenges in the context of this specification. If the Authorization Server supports metadata as defined in {{RFC8414}}, it MUST signal support for the challenge endpoint by including the metadata entry `challenge_endpoint` containing the URL of the endpoint as its value. If the Authorization Server offers a challenge endpoint, the Client MUST retrieve a challenge and MUST use this challenge in the OAuth-Attestation-PoP as defined in [](#client-attestation-pop-jwt).

A request for a Challenge is made by sending an HTTP POST request to the URL provided in the challenge_endpoint parameter of the Authorization Server metadata.

The following is a non-normative example of a request:

~~~
POST /as/challenge HTTP/1.1
Host: as.example.com
Accept: application/json
~~~

The Authorization Server provides a Challenge in the HTTP response with a 200 status code and the following parameters included in the message body of the HTTP response using the application/json media type:

* attestation_challenge: REQUIRED if the authorization server supports Client Attestations and server provided challenges as described in this document. String containing a Challenge to be used in the OAuth-Attestation-PoP as defined in [](#client-attestation-pop-jwt). The intention of this element not being required in other circumstances is to preserve the ability for the challenge endpoint to be used in other applications unrelated to client attestations.

The Authorization Server MUST make the response uncacheable by adding a `Cache-Control` header field including the value `no-store`. The Authorization Server MAY add additional challenges or data.

The following is a non-normative example of a response:

~~~
HTTP/1.1 200 OK
Host: as.example.com
Content-Type: application/json
Cache-Control: no-store

{
  "attestation_challenge": "AYjcyMzY3ZDhiNmJkNTZ"
}
~~~

## Providing Challenges on Previous Responses {#challenge-header}

The Authorization Server MAY provide a fresh Challenge with any HTTP response using a HTTP header-based syntax. The HTTP header field parameter MUST be named "OAuth-Client-Attestation-Challenge" and contain the value of the Challenge. The Client MUST use this new Challenge for the next OAuth-Client-Attestation-PoP.

The following is a non-normative example of an Authorization Response containing a fresh Challenge:

~~~
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
OAuth-Client-Attestation-Challenge: AYjcyMzY3ZDhiNmJkNTZ

{
  "access_token": "2YotnFZFEjr1zCsicMWpAA",
  "token_type": "Bearer",
  "expires_in": 3600
}
~~~

# Verification and Processing {#verification}

## Client Attestation JWT {#verification-client-attestation-jwt}

To validate a Client Attestation, the receiving server MUST ensure the following conditions and rules:

1. There is precisely one `OAuth-Client-Attestation` HTTP request header field containing a Client Attestation JWT.
1. The Client Attestation JWT contains all required claims and header parameters as per [](#client-attestation-jwt).
1. The alg JOSE Header Parameter contains a registered algorithm {{IANA.JOSE.ALGS}}, is not none, is supported by the application, and is acceptable per local policy.
1. The signature of the Client Attestation JWT verifies with the public key of a known and trusted Client Attester.
1. The key contained in the `cnf` claim of the Client Attestation JWT is not a private key.
1. The Client Attestation JWT is fresh enough per local policy of the Authorization Server by checking the `iat` or `exp` claims.
1. If a `client_id` is provided in the request containing the Client Attestation, then this `client_id` matches the `sub` claim of the Client Attestation JWT.

## Client Attestation PoP JWT {#verification-client-attestation-pop-jwt}

1. There is precisely one `OAuth-Client-Attestation-PoP` HTTP request header field containing a Client Attestation PoP JWT.
1. The Client Attestation PoP JWT contains all required claims and header parameters as per [](#client-attestation-pop-jwt).
1. The alg JOSE Header Parameter contains a registered algorithm {{IANA.JOSE.ALGS}}, is not none, is supported by the application, and is acceptable per local policy.
1. The signature of the Client Attestation PoP JWT verifies with the public key contained in the `cnf` claim of the Client Attestation JWT.
1. If the server provided a challenge value to the client, the `challenge` claim is present in the Client Attestation PoP JWT and matches the server-provided challenge value.
1. The creation time of the Client Attestation PoP JWT as determined by either the `iat` claim or a server managed timestamp via the challenge claim, is within an acceptable window per local policy of the Authorization Server.
1. The audience claim in the Client Attestation PoP JWT is the issuer identifier URL of the Authorization Server as described in {{RFC8414}}.
1. Depending on the security requirements of the deployment, additional checks to guarantee replay protection for the Client Attestation PoP JWT might need to be applied (see [](#security-consideration-replay) for more details).

## DPoP

todo

## Errors {#errors}

When validation errors specifically related to the use of client attestations are encountered the following additional error codes are defined for use in either Authorization Server authenticated endpoint error responses (as defined in Section 5.2 of {{RFC6749}}) or Resource Server error responses (as defined in Section 3 of {{RFC6750}}).

- `use_attestation_challenge` MUST be used when the Client Attestation PoP JWT is not using an expected server-provided challenge. When used this error code MUST be accompanied by the `OAuth-Client-Attestation-Challenge` HTTP header field parameter (as described in [](#challenge-header)).
- `use_fresh_attestation` MUST be used when the Client Attestation JWT is deemed to be not fresh enough to be acceptable by the server.
- `invalid_client_attestation` MAY be used in addition to the more general `invalid_client` error code as defined in {{RFC6749}} if the attestation or its proof of possession could not be successfully verified.

In the event of errors due to situations not described above, Authorization and Resource Servers MUST follow the guidance of {{RFC6749}} and {{RFC6750}} or their respective extensions of when to return suitable Error Responses.

## Client Attestation as an OAuth Client Authentication

A Client Attestation may be used as an OAuth 2 Client Authentication mechanism as described in Section 2.3 of {{RFC6749}} towards an Authorization Server.  If the token request contains a `client_id` parameter as per {{RFC6749}} the Authorization Server MUST verify that the value of this parameter is the same as the client_id value in the `sub` claim of the Client Attestation.

The following example demonstrates usage of the client attestation mechanism in an access token request (with extra line breaks for display purposes only):

~~~
POST /token HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded
OAuth-Client-Attestation: eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRpb24
rand0IiwiYWxnIjoiRVMyNTYiLCJraWQiOiIxMSJ9.eyJzdWIiOiJodHRwczovL2NsaWV
udC5leGFtcGxlLmNvbSIsImlhdCI6MTc3MjQ4NzU5NSwiZXhwIjoyNTI5ODY2Mzk0LCJj
bmYiOnsiandrIjp7Imt0eSI6IkVDIiwidXNlIjoic2lnIiwiY3J2IjoiUC0yNTYiLCJ4I
joiVmNLVk5CWjRJYUJBWVczanhNNHczVEpGVkE3bXllVUdReUd0LWdfeXZwUSIsInkiOi
JmLUUtaFlFM1RBV0t3aFZ2OXBlajlOQUJzOVNYOVhzTk84MHg1N2pGVHlVIn19fQ._TS4
d-LAnRlwdN97wiVnl4z7C9gvm45IWr-BvGTzeZaHtZtgNZ88gvzroU3LElUPbgF4kWi_D
FORnKzsx5yu6A
OAuth-Client-Attestation-PoP: eyJhbGciOiJFUzI1NiIsInR5cCI6Im9hdXRoLWN
saWVudC1hdHRlc3RhdGlvbi1wb3Arand0In0.eyJhdWQiOiJodHRwczovL2FzLmV4YW1w
bGUuY29tIiwianRpIjoiZDI1ZDAwYWItNTUyYi00NmZjLWFlMTktOThmNDQwZjI1MDY0I
iwibm9uY2UiOiI1YzFhOWUxMC0yOWZmLTRjMmItYWU3My01N2MwOTU3YzA5YzQifQ.U0u
AUL60MXSf2qB3uWoo1tQanBMLa7OJ-pk_GsA_o1rfJfRkUOyWpqeSbNH90ykVad-m6x5M
crEnFgCqdkNfUA

grant_type=authorization_code&
code=n0esc3NRze7LTCu7iYzS6a5acc3f0ogp4
~~~

## Client Attestation as an additional security signal

A Client Attestation may be used as a (additional) security signal towards an Authorization Server or Resource Server. This may provide additional assurance about the client's authenticity, integrity, state or other information contained in the Client Attestation. When used at the Authorization Server, the Client Attestation may appear along existing OAuth 2 Client Authentication mechanisms.

The following example demonstrates usage of the client attestation mechanism in a PAR request as defined in {{RFC9126}} along side client_secret (with extra line breaks for display purposes only):

~~~
POST /as/par HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded
OAuth-Client-Attestation: eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRpb24
rand0IiwiYWxnIjoiRVMyNTYiLCJraWQiOiIxMSJ9.eyJzdWIiOiJodHRwczovL2NsaWV
udC5leGFtcGxlLmNvbSIsImlhdCI6MTc3MjQ4NzU5NSwiZXhwIjoyNTI5ODY2Mzk0LCJj
bmYiOnsiandrIjp7Imt0eSI6IkVDIiwidXNlIjoic2lnIiwiY3J2IjoiUC0yNTYiLCJ4I
joiVmNLVk5CWjRJYUJBWVczanhNNHczVEpGVkE3bXllVUdReUd0LWdfeXZwUSIsInkiOi
JmLUUtaFlFM1RBV0t3aFZ2OXBlajlOQUJzOVNYOVhzTk84MHg1N2pGVHlVIn19fQ._TS4
d-LAnRlwdN97wiVnl4z7C9gvm45IWr-BvGTzeZaHtZtgNZ88gvzroU3LElUPbgF4kWi_D
FORnKzsx5yu6A
OAuth-Client-Attestation-PoP: eyJhbGciOiJFUzI1NiIsInR5cCI6Im9hdXRoLWN
saWVudC1hdHRlc3RhdGlvbi1wb3Arand0In0.eyJhdWQiOiJodHRwczovL2FzLmV4YW1w
bGUuY29tIiwianRpIjoiZDI1ZDAwYWItNTUyYi00NmZjLWFlMTktOThmNDQwZjI1MDY0I
iwibm9uY2UiOiI1YzFhOWUxMC0yOWZmLTRjMmItYWU3My01N2MwOTU3YzA5YzQifQ.U0u
AUL60MXSf2qB3uWoo1tQanBMLa7OJ-pk_GsA_o1rfJfRkUOyWpqeSbNH90ykVad-m6x5M
crEnFgCqdkNfUA

response_type=code
&state=af0ifjsldkj
&client_id=s6BhdRkqt3
&client_secret=7Fjfp0ZBr1KtDRbnfVdmIw
&redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb
&code_challenge=K2-ltc83acc4h0c9w6ESC_rEMTJ3bww-uCHaoeK1t8U
&code_challenge_method=S256&scope=account-information
~~~

The following example demonstrates usage of the client attestation mechanism at the Resource Server (with extra line breaks for display purposes only):

~~~
POST /api/users/list HTTP/1.1
Host: rs.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer mF_9.B5f-4.1JqM
Accept: application/json
OAuth-Client-Attestation: eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRpb24
rand0IiwiYWxnIjoiRVMyNTYiLCJraWQiOiIxMSJ9.eyJzdWIiOiJodHRwczovL2NsaWV
udC5leGFtcGxlLmNvbSIsImlhdCI6MTc3MjQ4NzU5NSwiZXhwIjoyNTI5ODY2Mzk0LCJj
bmYiOnsiandrIjp7Imt0eSI6IkVDIiwidXNlIjoic2lnIiwiY3J2IjoiUC0yNTYiLCJ4I
joiVmNLVk5CWjRJYUJBWVczanhNNHczVEpGVkE3bXllVUdReUd0LWdfeXZwUSIsInkiOi
JmLUUtaFlFM1RBV0t3aFZ2OXBlajlOQUJzOVNYOVhzTk84MHg1N2pGVHlVIn19fQ._TS4
d-LAnRlwdN97wiVnl4z7C9gvm45IWr-BvGTzeZaHtZtgNZ88gvzroU3LElUPbgF4kWi_D
FORnKzsx5yu6A
OAuth-Client-Attestation-PoP: eyJhbGciOiJFUzI1NiIsInR5cCI6Im9hdXRoLWN
saWVudC1hdHRlc3RhdGlvbi1wb3Arand0In0.eyJhdWQiOiJodHRwczovL3JzLmV4YW1w
bGUuY29tIiwianRpIjoiZDI1ZDAwYWItNTUyYi00NmZjLWFlMTktOThmNDQwZjI1MDY0I
iwibm9uY2UiOiI1YzFhOWUxMC0yOWZmLTRjMmItYWU3My01N2MwOTU3YzA5YzQifQ.gzk
0WkWsjNNx92gVMSp6jVpPDUvR0toYxLMyGmJMJOfm8mG2Otg0Nfm4PefOUpwBMNQtIXSd
dW-cqJopljQaCQ
~~~

# Authorization Server Metadata {#as-metadata}

The Authorization Server SHOULD communicate support and requirement for authentication with Attestation-Based Client Authentication by using the value `attest_jwt_client_auth` in the `token_endpoint_auth_methods_supported` within its published metadata. The client SHOULD fetch and parse the Authorization Server metadata and recognize Attestation-Based Client Authentication as a client authentication mechanism if the given parameters are present.

The Authorization Server SHOULD communicate supported algorithms for client attestations by using `client_attestation_signing_alg_values_supported` and `client_attestation_pop_signing_alg_values_supported` within its published metadata. This enables the client to validate that its client attestation is understood by the Authorization Server prior to authentication. The client MAY try to get a new client attestation with different algorithms. The Authorization Server MUST include `client_attestation_signing_alg_values_supported` and `client_attestation_pop_signing_alg_values_supported` in its published metadata if the `token_endpoint_auth_methods_supported` includes `attest_jwt_client_auth`.

# Implementation Considerations

## Reuse of a Client Attestation JWT

Implementers should be aware that the design of this authentication mechanism deliberately allows for a Client Instance to re-use a single Client Attestation JWT in multiple interactions/requests with an Authorization Server, whilst producing a fresh Client Attestation PoP JWT. Client deployments should consider this when determining the validity period for issued Client Attestation JWTs as this ultimately controls how long a Client Instance can re-use a single Client Attestation JWT.

## Refresh token binding

Authorization servers issuing a refresh token in response to a token request using the client attestation mechanism as defined by this draft MUST bind the refresh token to the Client Instance and its associated public key, and NOT just the client as specified in section 6 {{RFC6749}}. To prove this binding, the Client Instance MUST use the client attestation mechanism when refreshing an access token. The client MUST also use the same key that was present in the "cnf" claim of the client attestation that was used when the refresh token was issued.

## Web Server Default Maximum HTTP Header Sizes

Because the Client Attestation and Client Attestation PoP are communicated using HTTP headers, implementers should consider that web servers may have a default maximum HTTP header size configured which could be too low to allow conveying a Client Attestation and or Client Attestation PoP in an HTTP request. It should be noted, that this limit is not given by the HTTP {{RFC9112}}, but instead web server implementations commonly set a default maximum size for HTTP headers. As of 2024, typical limits for modern web servers configure maximum HTTP headers as 8 kB or more as a default.

## Rotation of Client Instance Key

This specification does not provide a mechanism to rotate the Client Instance Key in the Client Attestation JWT's "cnf" claim. If the Client Instance needs to use a new Client Instance Key for any reason, then it MUST request a new Client Attestation JWT from its Client Attester.

## Replay Attack Detection {#implementation-consideration-replay}

Authorization Servers implementing measures to detect replay attacks as described in [](#security-consideration-replay) require efficient data structures to manage large amounts of challenges for use cases with high volumes of transactions. To limit the size of the data structure, the Authorization Server should use a sliding window, allowing Client Attestation PoPs within a certain time window, in which the seen `challenge` or `jti` values are stored, but discarded afterwards. To ensure security, Client Attestation PoPs outside this time window MUST be rejected by the Authorization Server. The allowed window is determined by the `iat` of the Client Attestation PoP and the sliding window time duration chosen by the Authorization Server. These data structures need to:

- search the data structure to validate whether a challenge form a Client Attestation PoP has been previously seen
- insert the new challenges from the Client Attestation PoP if the search returned no result
- delete the challenges after the Client Attestation PoP has passed the sliding time window

A trie (also called prefix tree), or a patricia trie (also called radix tree) is a RECOMMENDED data structures to implement such a mechanism.

# Privacy Considerations

## Client Instance Tracking Across Authorization Servers

Implementers should be aware that using the same client attestation across multiple authorization servers could result in correlation of the end user using the Client Instance through claim values (including the Client Instance Key in the `cnf` claim). Client deployments are therefore RECOMMENDED to use different Client Attestation JWTs with different Client Instance Keys across different authorization servers.

# Security Considerations

The guidance provided by {{RFC7519}} and {{RFC8725}} applies.

## Replay Attacks {#security-consideration-replay}

An Authorization Server SHOULD implement measures to detect replay attacks by the Client Instance. In the context of this specification, this means to detect that an attacker is resending the same Client Attestation PoP JWT in multiple requests. The following options are RECOMMENDED for this client authentication method:

- The Authorization Server manages a list of witnessed `jti` values of the Client Attestation PoP JWT for the time window of which the JWT would be considered valid. This sliding time window is based on the `iat` of the Client Attestation PoP and and the duration chosen by the Authorization Server. If any Client Attestation PoP JWT would be replayed, the Authorization Server would recognize the `jti` value in the list and respond with an authentication error. Details how to implement such a data structure to maintain `jti` values is given in [](#implementation-consideration-replay).
- The Authorization Server provides a challenge as an `OAuth-Client-Attestation-Challenge` in the challenge endpoint to the Client Instance and the Client uses it as a `challenge` value in the Client Attestation PoP JWT. The Authorization Server may chose to:
  - manage a list of witnessed `challenge` values, similar to the previously described `jti` approach. Details how to implement such a data structure to maintain `challenge` values is given in [](#implementation-consideration-replay). This guarantees stronger replay protection with a challenge chosen by the Authorization Server itself, at the potential cost of an additional round-trip.
  - use self-contained challenges while not storing the seen challenges. This approach scales well, while only guaranteeing freshness, but no replay protection within the limited time-window chosen by the Authorization Server.
- The Authorization Server generates a challenge that is bound to the Client Instance's session, such that a specific `challenge` in the Client Attestation PoP JWT is expected and validated. The Authorization Server may either:
  - send the challenge as part of another previous response to the Client Instance of providing the challenge explicitly
  - reuse an existing artefact of the Client Instance's session, e.g. the authorization code. This MUST be communicated out-of-band between Authorization Server and Client.

Note that protocols that provide a challenge as part of a previous response should provide a clear indicator for clients when this feature is used. This makes it easier for client implementations to deal with proper state handling. This can be implicit by always mandating support for this feature or via some metadata that allows the client to detect support for this feature for a specific server.

Because clock skews between servers and clients may be large, Authorization Servers MAY limit Client Attestation PoP lifetimes by using server-provided challenge values containing the time at the server rather than comparing the client-supplied iat time to the time at the server. Challenges created in this way yield the same result even in the face of arbitrarily large clock skews.

In any case the Authorization Server SHOULD ensure the freshness of the Client Attestation PoP by checking either the iat claim or if present the server provided challenge, is within an acceptable time window.

The approach using a challenge explicitly provided by the Authorization Server gives stronger replay attack detection guarantees, however support by the Authorization Server is OPTIONAL to simplify mandatory implementation requirements. The `jti` value is mandatory and hence acts as a default fallback.

## Client Attestation Protection

This specification allows both, digital signatures using asymmetric cryptography, and Message Authentication Codes (MAC) to be used to protect Client Attestation JWTs. Implementers should only use MACs to secure the integrity of Client Attestations JWTs if they fully understand the risks of MACs when compared to digital signatures and especially the requirements of their use-case scenarios.
These use-cases typically represent deployments where the Client Attester and Authorization Server have a trust relationship and the possibility to securely exchange keys out of band or are the same entity and no other entity needs to verify the Client Attestations. We expect most deployments to use digital signatures for the protection of Client Attestations, and implementers SHOULD default to digital signatures if they are unsure.

# Relation to RATS

The Remote Attestation Procedures (RATS) architecture defined by {{RFC9334}} has some commonalities to this document. The flow specified in this specification relates to the "Passport Model" in RATS. However, while the RATS ecosystem gives explicit methods and values how the RATS Attester proves itself to the Verifier, this is deliberately out of scope for Attestation-Based Client Authentication. Additionally, the terminology between RATS and OAuth is different:

- a RATS "Attester" relates to an OAuth "Client"
- a RATS "Relying Party" relates to an OAuth "Authorization Server or Resource Server"
- a RATS "Verifier" relates to the "Client Attester" defined in this specification
- a RATS "Attestion Result" relates to the "Client Attestation JWT" defined by this specification
- a RATS "Endorser", "Reference Value Provider", "Endorsement", "Evidence" and "Policies and Reference Values" are out of scope for this specification

# IANA Considerations

## OAuth Parameters Registration

This specification requests registration of the following values in the IANA "OAuth Authorization Server Metadata" registry {{IANA.OAuth.Params}} established by {{RFC8414}}.

* Metadata Name: challenge_endpoint
* Metadata Description: URL of the authorization servers challenge endpoint which is used to obtain a fresh challenge for usage in client authentication methods such as client attestation.
* Change Controller: IETF
* Reference: [](#challenge-retrieval) of this specification

## OAuth Extensions Error Registration

This specification requests registration of the following values in the IANA "OAuth Extensions Error Registry" registry of {{IANA.OAuth.Params}} established by {{RFC6749}}.

* Name: use_attestation_challenge
* Usage Location: token error response, resource access error response
* Protocol Extension: OAuth 2.0 Attestation-Based Client Authentication
* Change Controller: IETF
* Reference: [](#errors) of this specification

<br/>

* Name: use_fresh_attestation
* Usage Location: token error response, resource access error response
* Protocol Extension: OAuth 2.0 Attestation-Based Client Authentication
* Change Controller: IETF
* Reference: [](#errors) of this specification

<br/>

* Name: invalid_client_attestation
* Usage Location: token error response, resource access error response
* Protocol Extension: OAuth 2.0 Attestation-Based Client Authentication
* Change Controller: IETF
* Reference: [](#errors) of this specification

## OAuth Authorization Server Metadata Registration

This specification requests registration of the following values in the IANA "OAuth Authorization Server Metadata" registry of {{IANA.OAuth.Params}} established by {{RFC8414}}.

* Metadata Name: client_attestation_signing_alg_values_supported
* Metadata Description: JSON array containing a list of the JWS signing algorithms supported by the authorization server for the signature on the Client Attestation JWT.
* Change Controller: IETF
* Reference: [](#as-metadata) of this specification

<br/>

* Metadata Name: client_attestation_pop_signing_alg_values_supported
* Metadata Description: JSON array containing a list of the JWS signing algorithms supported by the authorization server for the signature on the Client Attestation PoP JWT.
* Change Controller: IETF
* Reference: this specification

## Registration of attest_jwt_client_auth Token Endpoint Authentication Method

This section registers the value "attest_jwt_client_auth" in the IANA "OAuth Token Endpoint Authentication Methods" registry established by OAuth 2.0 Dynamic Client Registration Protocol {{RFC7591}}.

* Token Endpoint Authentication Method Name: "attest_jwt_client_auth"
* Change Controller: IESG
* Specification Document(s): TBC

## HTTP Field Name Registration

This section requests registration of the following scheme in the "Hypertext Transfer Protocol (HTTP) Field Name Registry" {{IANA.HTTP.Fields}} described in {{RFC9110}}:

* Field Name: OAuth-Client-Attestation
* Status: permanent
* Structured Type: Item
* Reference: [](#client-attestation-jwt) of this specification

<br/>

* Field Name: OAuth-Client-Attestation-PoP
* Status: permanent
* Structured Type: Item
* Reference: [](#client-attestation-pop-jwt) of this specification

<br/>

* Field Name: OAuth-Client-Attestation-Challenge
* Status: permanent
* Structured Type: Item
* Reference: [](#challenge-retrieval) of this specification
--- back

# Document History

-09

* restructure draft

-08

* remove concatenated Serialization for Client Attestations
* update all examples (removal of iss and nbf)
* remove `iss` from Client Attestation JWT and Client Attestation PoP JWT
* add small security consideration sub-section for MAC-based deployments
* remove public clients reference and clarify this draft targets confidential clients
* clarify this may be a client authentication mechanism but also may be not
* add examples for RS usage and non client authentication
* Add note on protocols providing a challenge on previous responses
* add structured-type to iana header field registration requests
* moving Authorization Server metadata into it's own top level section
* editorial fixes

-07

* remove restrictions to not allow MAC-based algorithms
* require `iat` in Client Attestation PoP JWT
* clarify `use_attestation_challenge` and add `invalid_client_attestation`
* add `client_attestation_signing_alg_values_supported` and `client_attestation_pop_signing_alg_values_supported` to IANA registration
* add implementation consideration for Authorization Server Metadata
* clarify refresh token binding
* check client_id at PAR endpoint
* added `use_fresh_attestation` as an error to signal that the attestation was not deemed fresh enough by the server
* mandate the defined header fields if the attestation and pop are transferred via header fields

-06

* clarify client_id processing in token request with client attestation
* clarify usage of client attestation outside of oauth2 applications
* add oauth error response values `invalid_client_attestation` and `use_attestation_challenge`
* revert the HTTP OPTIONS mechanism to fetch nonces and add a dedicated challenge endpoint
* rename nonce to challenge
* rewrite security consideration on replay attacks
* add implementation consideration on replay attacks
* remove `exp` from Client Attestation PoP JWT
* add verification and processing rules

-05

* add nonce endpoint
* add metadata entry for nonce
* improve introduction
* rename client backend to client attester
* fix missing typ header in examples

-04

* remove key attestation example
* restructured JWT Claims for better readability
* added JOSE typ values for Client Attestation and Client Attestation PoP
* add RATS relation
* add concatenated representation without headers
* add PAR endpoint example
* fix PoP examples to include jti and nonce
* add iana http field name registration

-03

* remove usage of RFC7521 and the usage of client_assertion
* add new header-based syntax introducing Oauth-Client-Attestation and OAuth-Client-Attestation-PoP
* add Client Instance to the terminology and improve text around this concept

-02

* add text on the inability to rotate the Client Instance Key

-01

* Updated eIDAS example in appendix
* Removed text around jti claim in client attestation, refined text for its usage in the client attestation pop
* Refined text around cnf claim in client attestation
* Clarified how to bind refresh tokens to a Client Instance using this client authentication method
* Made it more explicit that the client authentication mechanism is general purpose making it compatible with extensions like PAR
* Updated acknowledgments
* Simplified the diagram in the introduction
* Updated references
* Added some guidance around replay attack detection

-00

* Initial draft

# Acknowledgments
{:numbered="false"}

We would like to thank
Babis Routis,
Brian Campbell,
Dimitris Zarras,
Filip Skokan,
Francesco Marino,
Frederik Krogsdal Jacobsen,
Guiseppe De Marco,
Joseph Heenan,
Kristina Yasuda,
Micha Kraus,
Michael B. Jones,
Takahiko Kawasaki,
Timo Glastra
and
Torsten Lodderstedt
for their valuable contributions to this specification.
