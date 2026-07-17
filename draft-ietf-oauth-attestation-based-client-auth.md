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
  email: paul.bastian@posteo.de
-
  fullname: Christian Bormann
  organization: SPRIND
  email: chris.bormann@gmx.de


normative:
  RFC6749:
  RFC6750:
  RFC7515:
  RFC7591:
  RFC7519:
  RFC7800:
  RFC8126:
  RFC8414:
  RFC8725:
  RFC9110:
  RFC9112:
  RFC9126:
  RFC9449:
  RFC9728:
  IANA.HTTP.Fields:
    author:
      org: "IANA"
    title: "Hypertext Transfer Protocol (HTTP) Field Name Registry"
    target: "https://www.iana.org/assignments/http-fields/http-fields.xhtml"
  IANA.OAuth.Params:
    author:
      org: "IANA"
    title: "OAuth Parameters"
    target: "https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml"
  IANA.JOSE.ALGS:
    author:
      org: "IANA"
    title: "JSON Web Signature and Encryption Algorithms"
    target: "https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms"

informative:
  RFC9334:
  RFC7523:
  RFC9901:
  CIBA:
    title: OpenID Connect Client-Initiated Backchannel Authentication Flow - Core 1.0
    target: https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html

--- abstract

This specification defines an extension to the OAuth 2.0 protocol (RFC 6749) that enables a client instance to include a key-bound attestation when interacting with an Authorization Server or Resource Server. This mechanism allows a client instance to prove its authenticity verified by a client attester without revealing its target audience to that attester. It may also serve as a mechanism for client authentication as per OAuth 2.0.

--- middle

# Introduction

Traditional OAuth client authentication methods, such as `private_key_jwt` defined in {{RFC7523}}, typically rely on a direct connection between the client's backend and the Authorization Server. In ecosystems such as the Issuer-Holder-Verifier model used in {{RFC9901}}, this direct communication raises privacy concerns, as it would enable the client's backend (i.e. client attester) to correlate which Holder (i.e. client) interacts with which Issuer (i.e. Authorization Server) and potentially observe the credentials or metadata being issued. This specification establishes a mechanism for a backend-attested client authentication through a front-channel to address these issues.

Additionally, this approach acknowledges the evolving landscape of OAuth 2 deployments, where the ability for mobile native apps to authenticate securely and reliably has become increasingly important. Leveraging platform mechanisms to validate a client instance, such as mobile native apps, enables secure authentication that would otherwise be difficult with traditional OAuth client authentication methods. Transforming these platform-specific mechanisms into a common format as described in this specification abstracts this complexity to minimize the efforts for the Authorization Server.

The primary purpose of this specification is the authentication of a client instance enabled through the client backend attesting to it. The client backend may also attest further technical properties about the hardware and software of the client instance.

The client is considered a confidential OAuth 2 client type according to {{Section 2.1 of RFC6749}}. The mechanism described in this document may either serve as a standalone OAuth 2 client authentication mechanism or as an additional, supportive security mechanism beside an existing OAuth 2 client authentication mechanism.

This specification introduces the concept of client attestations to the OAuth 2 protocol, using two artifacts:

- a Client Attestation, a signed statement by the Client Attester that authenticates the Client Instance
- a Proof of Possession (PoP), a signed statement by the Client Instance that authenticates the Client Attestation

The following diagram depicts the overall architecture and protocol flow towards an Authorization Server.

~~~ ascii-art
                  (3)
                +-----+
                |     |
                |     v
           +-----------------+
           |                 |
           | Client Attester |
           |   (backend)     |
           |                 |
           +-----------------+
               ^       |
           (2) |       | (4)
               |       v
           +---------------+           +---------------+
    +----->|               |    (5)    |               |
(1) |      |    Client     |<--------->| Authorization |
    |      |   Instance    |    (7)    |    Server     |
    +------|               |<--------->|               |
           +---------------+           +---------------+
               ^       |
               |       |
               +-------+
                  (6)

~~~

The following steps describe this OAuth flow:

(1) The Client Instance generates a key (Client Instance Key) and gathers optional evidence to prove its authenticity to the Client Attester. This could be evidence about the software running on the client, statements about the integrity of the operating system, or hardware the Client Instance is running on. A Client Instance can provide several such statements or attestations to the Client Attester within a single request, but their content, how they are collected, and how they are transmitted are out of scope of this specification.

(2) The Client Instance sends this data to the Client Attester in request for a Client Attestation JWT. Transmission of the evidence may result in one or multiple requests.

(3) The Client Attester authenticates the Client Instance, validates that the Client Instance is in control of the private key of the Client Instance Key, and evaluates any further provided evidence according to its policy. It then generates a signed Client Attestation JWT that is cryptographically bound to the Client Instance Key generated by the Client. Therefore, the attestation is bound to this particular Client Instance.

(4) The Client Attester responds to the Client Instance by sending the Client Attestation JWT.

(5) The Client Instance optionally requests a Challenge from the Authorization Server's Challenge endpoint or receives a challenge from a previous message.

(6) The Client Instance generates a Proof of Possession (PoP) with the Client Instance Key.

(7) The Client Instance sends the Client Attestation JWT along with its Proof of Possession to the Authorization Server, e.g. within a token request. The Proof of Possession is typically a Client Attestation PoP JWT or a DPoP proof (see [](#pop)). The Authorization Server validates the Client Attestation and thus authenticates the Client Instance.

The same flow applies when authenticating to a Resource Server, where step (7) typically occurs when accessing a protected resource.

Please note that the protocol details for steps (2) and (4), particularly how the Client Instance authenticates to the Client Attester, are beyond the scope of this specification. Furthermore, this specification is designed to be flexible and can be implemented even in scenarios where the client does not have a backend serving as a Client Attester. In such cases, each Client Instance is responsible for performing the functions typically handled by the Client Attester on its own.

While the concrete evidence about the Client Instance collected and transmitted in (1) and (2) is out of scope, a Client Attestation JWT is generally understood to convey that the Client Attester has verified

- the authenticity and integrity of the Client Instance (this might encompass statements about its software and hardware environment)
- that the Client Instance controls the private key of the Client Instance Key
- optionally, properties of that key (e.g., that it was securely generated or resides in hardware-backed storage)

# Conventions and Definitions

{::boilerplate bcp14-tagged}

# Terminology {#terminology}

Client Attestation JWT:
:  A JSON Web Token (JWT) generated by the Client Attester that attests to the authenticity of a Client Instance and is cryptographically bound to a key managed by that Client Instance. A Client Attestation JWT may additionally convey information about the integrity or state of the Client Instance.

Client Attestation Proof of Possession (PoP) JWT:
:  A Proof of Possession generated by the Client Instance using the key that the Client Attestation JWT is bound to.

Client Instance:
: A deployed instance of a piece of client software.

Client Instance Key:
:  A cryptographic asymmetric key pair that is generated by the Client Instance where the public key of the key pair is provided to the Client Attester. This public key is then encapsulated within the Client Attestation JWT and is utilized to sign a proof of possession.

Client Attester:
: An entity that authenticates a Client Instance and attests it by issuing a Client Attestation JWT.

Challenge:
: A String that is the input to a cryptographic challenge-response pattern, used to detect replay attacks. Within OAuth, this is traditionally called a nonce.

# Client Attestation JWT {#client-attestation-jwt}

The Client Attestation MUST be encoded as a "JSON Web Token (JWT)" according to {{RFC7519}}.

The following content applies to the JWT Header:

* `typ`: REQUIRED. The `typ` (JWT type) header MUST be `oauth-client-attestation+jwt`.
* `alg`: REQUIRED. The `alg` (algorithm) header MUST specify the cryptographic algorithm used to sign the Client Attestation.

The following content applies to the JWT Claims Set:

* `sub`: REQUIRED. The `sub` (subject) claim MUST specify client_id value of the OAuth Client.
* `exp`: REQUIRED. The `exp` (expiration time) claim MUST specify the time at which the Client Attestation is considered expired by its issuer. The Authorization Server or Resource Server MUST reject any JWT with an expiration time that has passed, subject to allowable clock skew between systems.
* `cnf`: REQUIRED. The `cnf` (confirmation) claim MUST specify a key conforming to {{RFC7800}} that is used by the Client Instance to generate the Client Attestation PoP JWT for client authentication with an Authorization Server or Resource Server. The key MUST be expressed using the "jwk" representation.
* `iat`: OPTIONAL. The `iat` (issued at) claim MUST specify the time at which the Client Attestation was issued.

The following additional rules apply:

1. The JWT MAY contain other claims. All claims that are not understood by implementations MUST be ignored.

2. The JWT MUST be digitally signed or integrity protected with a Message Authentication Code (MAC). The Authorization Server or Resource Server MUST reject JWTs if signature or integrity protection validation fails.

3. The Authorization Server or Resource Server MUST reject a JWT that is not valid in all other respects per "JSON Web Token (JWT)" {{RFC7519}}.

The following example is the decoded header and payload of a JWT meeting the processing rules as defined above.

~~~
{
  "typ": "oauth-client-attestation+jwt",
  "alg": "ES256",
  "kid": "11"
}
.
{
  "sub": "https://client.example.com",
  "iat": 1772487595,
  "exp": 2529866394,
  "cnf": {
    "jwk": {
      "kty": "EC",
      "use": "sig",
      "crv": "P-256",
      "x": "VcKVNBZ4IaBAYW3jxM4w3TJFVA7myeUGQyGt-g_yvpQ",
      "y": "f-E-hYE3TAWKwhVv9pej9NABs9SX9XsNO80x57jFTyU"
    }
  }
}
~~~

When using headers to transfer the Client Attestation JWT to an Authorization Server or Resource Server, it MUST be provided in an HTTP request using the HTTP header field `OAuth-Client-Attestation`.

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

The OAuth-Client-Attestation HTTP header field value uses the token68 syntax defined in {{Section 11.2 of RFC9110}} (repeated below for ease of reference).

~~~ abnf
OAuth-Client-Attestation       = token68
token68                        = 1*( ALPHA / DIGIT / "-" / "." /
                                     "_" / "~" / "+" / "/" ) *"="
~~~

# Proof of Possession {#pop}

This specification defines two options for the proof of possession:

- A Client Attestation PoP JWT, introduced by this specification
- Utilizing DPoP as defined in {{RFC9449}}

Other specifications or profiles may define additional proof of possession mechanisms for use with the Client Attestation. Any such mechanism MUST demonstrate possession of the private key corresponding to the key in the `cnf` claim of the Client Attestation JWT and MUST define how a Challenge (see [](#challenges)) is incorporated into the proof of possession. Such specifications are also expected to register their own token endpoint authentication method value, analogous to `attest_jwt_client_auth` and `attest_jwt_client_auth_dpop` (see [](#as-metadata)).

## Client Attestation PoP JWT {#client-attestation-pop-jwt}

The Client Attestation PoP MUST be encoded as a "JSON Web Token (JWT)" according to {{RFC7519}}.

The following content applies to the JWT Header:

* `typ`: REQUIRED. The `typ` (JWT type) header MUST be `oauth-client-attestation-pop+jwt`.
* `alg`: REQUIRED. The `alg` (algorithm) header MUST specify the cryptographic algorithm used to sign the Client Attestation PoP

The following content applies to the JWT Claims Set:

* `aud`: REQUIRED. The `aud` (audience) claim MUST specify a value that identifies the intended audience of the JWT. When the JWT is presented to an Authorization Server, the {{RFC8414}} issuer identifier URL of the Authorization Server MUST be used. When the JWT is presented to a Resource Server, the {{RFC9728}} resource identifier URL of the Resource Server MUST be used. A Client Attestation PoP JWT is intended for a single audience, Clients MUST generate JWTs for each target.
* `jti`: REQUIRED. The `jti` (JWT identifier) claim MUST specify a unique identifier for the Client Attestation PoP. The Authorization Server or Resource Server can utilize the `jti` value for replay attack detection, see [](#security-consideration-replay).
* `iat`: REQUIRED. The `iat` (issued at) claim MUST specify the time at which the Client Attestation PoP was issued. Note that the Authorization Server or Resource Server may reject JWTs with an "iat" claim value that is unreasonably far in the past.
* `challenge`: OPTIONAL. The `challenge` (challenge) claim MUST specify a String value that is provided by the Authorization Server or Resource Server for the client to include in the Client Attestation PoP JWT.

The following additional rules apply:

1. The JWT MAY contain other claims. All claims that are not understood by implementations MUST be ignored.

2. The JWT MUST be digitally signed using an asymmetric cryptographic algorithm. The Authorization Server or Resource Server MUST reject JWTs with an invalid signature.

3. The public key used to verify the JWT MUST be the key located in the "cnf" claim of the corresponding Client Attestation JWT.

4. The Authorization Server or Resource Server MUST reject a JWT that is not valid in all other respects per "JSON Web Token (JWT)" {{RFC7519}}.

The following example is the decoded header and payload of a JWT meeting the processing rules as defined above.

~~~
{
  "typ": "oauth-client-attestation-pop+jwt",
  "alg": "ES256"
}
.
{
  "aud": "https://as.example.com",
  "jti": "d25d00ab-552b-46fc-ae19-98f440f25064",
  "iat": 1772487595,
  "challenge": "5c1a9e10-29ff-4c2b-ae73-57c0957c09c4"
}
~~~

When using headers to transfer the Client Attestation PoP JWT to an Authorization Server or Resource Server, it MUST be provided in an HTTP request using the HTTP header field `OAuth-Client-Attestation-PoP`.

The following is an example of the OAuth-Client-Attestation-PoP header.

~~~
OAuth-Client-Attestation-PoP: eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRp
b24tcG9wK2p3dCIsImFsZyI6IkVTMjU2In0.eyJhdWQiOiJodHRwczovL2FzLmV4YW1wb
GUuY29tIiwianRpIjoiZDI1ZDAwYWItNTUyYi00NmZjLWFlMTktOThmNDQwZjI1MDY0Ii
wiaWF0IjoxNzcyNDg3NTk1LCJjaGFsbGVuZ2UiOiI1YzFhOWUxMC0yOWZmLTRjMmItYWU
3My01N2MwOTU3YzA5YzQifQ.M4Uc4rWVAqaLlmDDUXQKkKPbAQKj0JrTizLgWhZndmbkv
M3VL8y-w_QJr7Z0HZlH94E64cLa8L5fSjJItYv0jg
~~~

Note that per {{RFC9110}} header field names are case-insensitive; so OAUTH-CLIENT-ATTESTATION-POP, oauth-client-attestation-pop, etc., are all valid and equivalent
header field names. Case is significant in the header field value, however.

The OAuth-Client-Attestation-PoP HTTP header field value uses the token68 syntax defined in {{Section 11.2 of RFC9110}} (repeated below for ease of reference).

~~~ abnf
OAuth-Client-Attestation-PoP   = token68
token68                        = 1*( ALPHA / DIGIT / "-" / "." /
                                     "_" / "~" / "+" / "/" ) *"="
~~~

## Using DPoP as the Proof of Possession {#dpop-combined-mode}

This section defines an optimization that allows a single Proof of Possession (PoP) JWT to satisfy the role of both (a) the Client Attestation PoP defined in this specification and (b) the DPoP proof defined in {{RFC9449}} for sender-constrained access tokens. In this "combined mode" the Client Instance Key and the DPoP Key are the same asymmetric key pair, and a request using the mechanism carries only one PoP, the DPoP proof, instead of two separate PoP JWTs (the DPoP proof and Client Attestation PoP JWT).

Note when authorization code binding as defined in {{Section 10 of RFC9449}} is used, this mode only works with the DPoP Proof header containing a proof of possession and not `dpop_jkt`. When using `dpop_jkt`, the normal mode has to be used.

Note that DPoP {{RFC9449}} can also be used alongside the Client Attestation PoP JWT without this combined mode. In this case, the DPoP proof is validated according to {{RFC9449}} independently of this specification and its public key is not required to match the key in the `cnf` claim of the Client Attestation JWT (see [](#verification)).

The following rules apply to the DPoP proof as defined in {{RFC9449}}:

1. The DPoP proof MUST adhere to {{RFC9449}}
2. The public key located in the DPoP proof MUST match the public key located in the `cnf` claim of the Client Attestation JWT.

The following non-normative example shows a token request using combined mode (line breaks for display only):

~~~ http
POST /token HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded
OAuth-Client-Attestation: <Client-Attestation-JWT>
DPoP: <Combined-DPoP-And-Attestation-PoP-JWT>

grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA
~~~

Decoded (non-normative) DPoP (combined) proof - Header:

~~~ json
{
  "typ": "dpop+jwt",
  "alg": "ES256",
  "jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "18wHLeIgW9wVN6VD1Txgpqy2LszYkMf6J8njVAibvhM",
    "y": "-V4dS4UaLMgP_4fY4j8ir7cl1TXlFdAgcx55o7TkcSA"
  }
}
~~~

Payload:

~~~ json
{
  "htm": "POST",
  "htu": "https://as.example.com/token",
  "iat": 1700000000,
  "jti": "7c20c3e2-0f52-4f74-81a5-5c7b83a7a1f9"
}
~~~

Note that additional claims may be present in the DPoP proof depending on the context, as required by {{RFC9449}}.

# Challenges {#challenges}

This section defines optional mechanisms that allow a Client to receive a fresh Challenge from the Authorization Server or Resource Server and to include the Challenge in the proof of possession. This construct may be similar or equivalent to a nonce, see [](#terminology). The value of the challenge is opaque to the client.

## Providing Challenges through the Challenge Endpoint {#challenge-endpoint}

The Authorization Server or Resource Server MAY offer a challenge endpoint for Clients to fetch Challenges in the context of this specification. If the Authorization Server supports metadata as defined in {{RFC8414}} or the Resource Server supports metadata as defined in {{RFC9728}}, it MUST signal support for the challenge endpoint by including the metadata entry `challenge_endpoint` containing the URL of the endpoint as its value. If the Authorization Server offers a challenge endpoint, the Client MUST retrieve a challenge and MUST use this challenge in the Client Attestation PoP JWT or DPoP Proof as defined in [](#pop).

A request for a Challenge is made by sending an HTTP POST request to the URL provided in the challenge_endpoint parameter of the Authorization Server metadata. The following is a non-normative example of a request:

~~~ http
POST /as/challenge HTTP/1.1
Host: as.example.com
Accept: application/json
~~~

The Authorization Server or Resource Server provides a Challenge in the HTTP response with a 200 status code and the following parameters included in the message body of the HTTP response using the application/json media type:

* attestation_challenge: REQUIRED if the Authorization Server or Resource Server supports Client Attestations and server-provided challenges as described in this document. String containing a Challenge to be used in the Client Attestation PoP JWT or DPoP Proof as defined in [](#pop). The intention of this element not being required in other circumstances is to preserve the ability for the challenge endpoint to be used in other applications unrelated to client attestations.

The Authorization Server or Resource Server MUST make the response uncacheable by adding a `Cache-Control` header field including the value `no-store`. The Authorization Server or Resource Server MAY add additional challenges or data.

The following is a non-normative example of a response:

~~~ http
HTTP/1.1 200 OK
Host: as.example.com
Content-Type: application/json
Cache-Control: no-store

{
  "attestation_challenge": "AYjcyMzY3ZDhiNmJkNTZ"
}
~~~

## Providing Challenges on Previous Responses {#challenge-in-response}

The Authorization Server or Resource Server MAY provide a fresh Challenge with any HTTP response using a HTTP header-based syntax. The HTTP header field parameter MUST be named "OAuth-Client-Attestation-Challenge" and contain the value of the Challenge. The Client MUST use this new Challenge for the next OAuth-Client-Attestation-PoP.

The following is a non-normative example of an Authorization Response containing a fresh Challenge:

~~~ http
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

This section defines the verification and processing rules for the proof of possession mechanisms defined by this specification. Proof of possession mechanisms defined by other specifications define their own verification and processing rules.

An Authorization Server MAY support both `attest_jwt_client_auth` and `attest_jwt_client_auth_dpop` and distinguish them by the following rules:

- If the request contains an `OAuth-Client-Attestation-PoP` HTTP request header field, the receiving server MUST apply the validation rules of [](#verification-client-attestation-pop-jwt) and if present, a DPoP proof present in the request is validated according to {{RFC9449}} independently of this specification.
- If no `OAuth-Client-Attestation-PoP` HTTP request header field is present, but a DPoP proof is, the receiving server MUST apply the validation rules of [](#verification-dpop-combined).

## Client Attestation JWT {#verification-client-attestation-jwt}

To validate a Client Attestation, the receiving server MUST ensure the following conditions and rules are met:

1. There is precisely one `OAuth-Client-Attestation` HTTP request header field containing a Client Attestation JWT.
1. The Client Attestation JWT contains all required claims and header parameters as per [](#client-attestation-jwt).
1. The alg JOSE Header Parameter contains a registered algorithm {{IANA.JOSE.ALGS}}, is not none, is supported by the application, and is acceptable per local policy.
1. The signature of the Client Attestation JWT verifies with the public key of a known and trusted Client Attester.
1. The key contained in the `cnf` claim of the Client Attestation JWT is not a private key.
1. The Client Attestation JWT is fresh enough per local policy of the Authorization Server or Resource Server by checking the `iat` or `exp` claims.
1. If a `client_id` is provided in the request containing the Client Attestation, then this `client_id` matches the `sub` claim of the Client Attestation JWT.

## Client Attestation PoP JWT {#verification-client-attestation-pop-jwt}

This section applies when the Client Attestation PoP JWT is used as the Proof of Possession. When operating in DPoP combined mode as defined in [](#dpop-combined-mode), this section does not apply; instead, see [](#verification-dpop-combined).

To validate a Client Attestation PoP, the receiving server MUST ensure the following conditions and rules are met:

1. There is precisely one `OAuth-Client-Attestation-PoP` HTTP request header field containing a Client Attestation PoP JWT.
1. The Client Attestation PoP JWT contains all required claims and header parameters as per [](#client-attestation-pop-jwt).
1. The alg JOSE Header Parameter contains a registered algorithm {{IANA.JOSE.ALGS}}, is not none, is supported by the application, and is acceptable per local policy.
1. The signature of the Client Attestation PoP JWT verifies with the public key contained in the `cnf` claim of the Client Attestation JWT.
1. If the server provided a challenge value to the client, the `challenge` claim is present in the Client Attestation PoP JWT and matches the server-provided challenge value.
1. The creation time of the Client Attestation PoP JWT as determined by either the `iat` claim or a server managed timestamp via the challenge claim, is within an acceptable window per local policy of the Authorization Server or Resource Server.
1. The audience claim in the Client Attestation PoP JWT identifies the receiving server: when validated by an Authorization Server, it MUST be the issuer identifier URL of the Authorization Server as described in {{RFC8414}}; when validated by a Resource Server, it MUST be the resource identifier URL of the Resource Server as described in {{RFC9728}}.
1. If the Client received a challenge through the Authorization Server's challenge endpoint or within previous responses as described in [](#challenges), it MUST match the challenge claim of the Client Attestation PoP JWT.
1. Depending on the security requirements of the deployment, additional checks to guarantee replay protection for the Client Attestation PoP JWT might need to be applied (see [](#security-consideration-replay) for more details).

## DPoP Combined Mode {#verification-dpop-combined}

This section applies when the DPoP combined mode is used as defined in [](#dpop-combined-mode). When the Client Attestation PoP JWT is used as the Proof of Possession instead, this section does not apply; see [](#verification-client-attestation-pop-jwt).

To validate a request using DPoP combined mode, the receiving server MUST perform the following steps:

1. There is no `OAuth-Client-Attestation-PoP` HTTP request header field present in the request.
1. There is precisely one `DPoP` HTTP request header field present in the request.
1. Validate the DPoP proof in accordance with {{RFC9449}}.
1. The public key in the `jwk` header parameter of the DPoP proof MUST be identical to the public key in the `cnf` claim of the Client Attestation JWT.
1. If the Client received a challenge through the Authorization Server's challenge endpoint or within previous responses as described in [](#challenges), it MUST match the nonce payload claim of the DPoP proof.

## Errors {#errors}

When validation errors specifically related to the use of client attestations are encountered the following additional error codes are defined for use in either Authorization Server authenticated endpoint error responses (as defined in {{Section 5.2 of RFC6749}}) or Resource Server error responses (as defined in {{Section 3 of RFC6750}}).

- `use_attestation_challenge` MUST be used when the Client Attestation PoP JWT is not using an expected server-provided challenge. When used this error code MUST be accompanied by the `OAuth-Client-Attestation-Challenge` HTTP header field parameter (as described in [](#challenge-in-response)).
- `use_fresh_attestation` MUST be used when the Client Attestation JWT is deemed to be not fresh enough to be acceptable by the server.
- `invalid_client_attestation` MAY be used in addition to the more general `invalid_client` error code as defined in {{RFC6749}} if the attestation or its proof of possession could not be successfully verified, the proof of possession is not supported.

In the event of errors due to situations not described above, Authorization and Resource Servers MUST follow the guidance of {{RFC6749}} and {{RFC6750}} or their respective extensions of when to return suitable Error Responses.

## Client Attestation as an OAuth Client Authentication

A Client Attestation may be used as an OAuth 2 Client Authentication mechanism as described in {{Section 2.3 of RFC6749}} towards an Authorization Server.  If the token request contains a `client_id` parameter as per {{RFC6749}} the Authorization Server MUST verify that the value of this parameter is the same as the client_id value in the `sub` claim of the Client Attestation.

The following example demonstrates usage of the client attestation mechanism in an access token request (with extra line breaks for display purposes only):

~~~ http
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
OAuth-Client-Attestation-PoP: eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRp
b24tcG9wK2p3dCIsImFsZyI6IkVTMjU2In0.eyJhdWQiOiJodHRwczovL2FzLmV4YW1wb
GUuY29tIiwianRpIjoiZDI1ZDAwYWItNTUyYi00NmZjLWFlMTktOThmNDQwZjI1MDY0Ii
wiaWF0IjoxNzcyNDg3NTk1LCJjaGFsbGVuZ2UiOiI1YzFhOWUxMC0yOWZmLTRjMmItYWU
3My01N2MwOTU3YzA5YzQifQ.M4Uc4rWVAqaLlmDDUXQKkKPbAQKj0JrTizLgWhZndmbkv
M3VL8y-w_QJr7Z0HZlH94E64cLa8L5fSjJItYv0jg

grant_type=authorization_code&
code=n0esc3NRze7LTCu7iYzS6a5acc3f0ogp4
~~~

## Client Attestation as an additional security signal {#additional-security-signal}

A Client Attestation may be used as a (additional) security signal towards an Authorization Server or Resource Server. This may provide additional assurance about the client's authenticity, integrity, state or other information contained in the Client Attestation. When used at the Authorization Server, the Client Attestation may appear alongside existing OAuth 2 Client Authentication mechanisms.

An Authorization Server or Resource Server MAY signal a requirement to Clients for presenting a Client Attestation and its Proof of Possession as an additional security signal alongside the regular request. A server signals this demand by including the `client_attestation_pop_methods_supported` metadata parameter in its published metadata, as defined in {{RFC8414}} for the Authorization Server and in {{RFC9728}} for the Resource Server. The value of `client_attestation_pop_methods_supported` is a JSON array of case-sensitive strings, each identifying a Proof of Possession method that the server accepts, as registered in the "OAuth Client Attestation Proof-of-Possession Methods" registry established by this specification (see [](#pop-methods)). A server MUST NOT include a method it does not accept, and the array MUST NOT be empty when the parameter is present.

When the parameter is omitted, presenting a Client Attestation as an additional security signal is OPTIONAL.
When the parameter includes `none`, the Client MAY omit the Client Attestation.
If the Client sends a Client Attestation, it MUST use one of the supported Proof of Possession methods.
For example, for `"client_attestation_pop_methods_supported": ["dpop_combined", "none"]`, the server accepts requests without a Client Attestation as well as requests carrying a Client Attestation with a DPoP proof as the Proof of Possession.
When the parameter is present and does not include `none`, a Client SHOULD include the Client Attestation and its Proof of Possession in its requests to that server, and the Client MUST use one of the listed Proof of Possession methods.

This specification registers the following Proof of Possession methods:

- `attestation_pop_jwt`: The Proof of Possession is a dedicated Client Attestation PoP JWT as defined in [](#client-attestation-pop-jwt) ("normal mode").
- `dpop_combined`: The Proof of Possession is a DPoP proof serving as the combined Proof of Possession as defined in [](#dpop-combined-mode) ("DPoP combined mode").
- `none`: No Client Attestation is required. A server includes this value to signal that the Client MAY omit the Client Attestation.

The following example demonstrates usage of the client attestation mechanism in a PAR request as defined in {{RFC9126}} alongside client_secret (with extra line breaks for display purposes only):

~~~ http
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
OAuth-Client-Attestation-PoP: eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRp
b24tcG9wK2p3dCIsImFsZyI6IkVTMjU2In0.eyJhdWQiOiJodHRwczovL2FzLmV4YW1wb
GUuY29tIiwianRpIjoiZDI1ZDAwYWItNTUyYi00NmZjLWFlMTktOThmNDQwZjI1MDY0Ii
wiaWF0IjoxNzcyNDg3NTk1LCJjaGFsbGVuZ2UiOiI1YzFhOWUxMC0yOWZmLTRjMmItYWU
3My01N2MwOTU3YzA5YzQifQ.M4Uc4rWVAqaLlmDDUXQKkKPbAQKj0JrTizLgWhZndmbkv
M3VL8y-w_QJr7Z0HZlH94E64cLa8L5fSjJItYv0jg

response_type=code
&state=af0ifjsldkj
&client_id=s6BhdRkqt3
&client_secret=7Fjfp0ZBr1KtDRbnfVdmIw
&redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb
&code_challenge=K2-ltc83acc4h0c9w6ESC_rEMTJ3bww-uCHaoeK1t8U
&code_challenge_method=S256&scope=account-information
~~~

The following example demonstrates usage of the client attestation mechanism at the Resource Server (with extra line breaks for display purposes only):

~~~ http
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
OAuth-Client-Attestation-PoP: eyJ0eXAiOiJvYXV0aC1jbGllbnQtYXR0ZXN0YXRp
b24tcG9wK2p3dCIsImFsZyI6IkVTMjU2In0.eyJhdWQiOiJodHRwczovL3JzLmV4YW1wb
GUuY29tIiwianRpIjoiZDI1ZDAwYWItNTUyYi00NmZjLWFlMTktOThmNDQwZjI1MDY0Ii
wiaWF0IjoxNzcyNDg3NTk1LCJjaGFsbGVuZ2UiOiI1YzFhOWUxMC0yOWZmLTRjMmItYWU
3My01N2MwOTU3YzA5YzQifQ.Uh-vRynTGGARZNqijGyovBMm_EsX5qu0fg0VGPVRsp1rJ
dF7rElbZcEv0CAtzm5kXhjSXHYGxEVb0I7HIeUFRg
~~~

# Authorization Server and Resource Server Metadata {#as-metadata}

The Authorization Server SHOULD communicate support for authentication with Attestation-Based Client Authentication using a Client Attestation PoP JWT as the PoP by using the value `attest_jwt_client_auth` in the `token_endpoint_auth_methods_supported` within its published metadata. The Authorization Server SHOULD communicate support for authentication with Attestation-Based Client Authentication using a DPoP proof as the PoP by using the value `attest_jwt_client_auth_dpop` in the `token_endpoint_auth_methods_supported` within its published metadata. The client SHOULD fetch and parse the Authorization Server metadata and recognize Attestation-Based Client Authentication as a client authentication mechanism if either of the given `token_endpoint_auth_methods_supported` values are present.

The Authorization Server or Resource Server SHOULD communicate supported algorithms for client attestations by using `client_attestation_signing_alg_values_supported` and `client_attestation_pop_signing_alg_values_supported` within its published metadata. This enables the client to validate that its client attestation is understood by the Authorization Server prior to authentication. The client MAY try to get a new client attestation with different algorithms. The Authorization Server or Resource Server MUST include `client_attestation_signing_alg_values_supported` and `client_attestation_pop_signing_alg_values_supported` in its published metadata if the Client Attestation PoP JWT mechanism is used. The Authorization Server or Resource Server MUST include `dpop_signing_alg_values_supported` as defined in {{RFC9449}}, if DPoP is used as the Proof of Possession in combined mode.

The Authorization Server or Resource Server MAY signal that it requires a Client Attestation as an additional security signal as described in [](#additional-security-signal). The Authorization Server includes the `client_attestation_pop_methods_supported` metadata parameter, containing a JSON array of the Proof of Possession methods it accepts, in its metadata as defined in {{RFC8414}}. The Resource Server uses the same `client_attestation_pop_methods_supported` parameter in its metadata as defined in {{RFC9728}}. The Proof of Possession method values are registered in the "OAuth Client Attestation Proof-of-Possession Methods" registry established by this specification (see [](#pop-methods)).

# Client Metadata {#client-metadata}

This section defines client metadata parameters for use with attestation-based client authentication. As described in {{RFC7591}}, client metadata defines a general data model for Clients that is useful even when the Dynamic Client Registration Protocol is not being used. A Client MAY use these values to compare its own capabilities against the Authorization Server or Resource Server metadata defined in [](#as-metadata) to determine whether it can interoperate with a given server prior to attempting authentication.

A Client that supports attestation-based client authentication as defined in this specification indicates this by using the value `attest_jwt_client_auth` or `attest_jwt_client_auth_dpop` in the `token_endpoint_auth_method` client metadata parameter defined in {{RFC7591}}.

In addition, the following client metadata parameters are defined:

* `client_attestation_signing_alg_values_supported`: OPTIONAL. JSON array containing a list of the JWS `alg` values (as defined in {{IANA.JOSE.ALGS}}) supported by the Client for signing the Client Attestation JWT. The values `none` and any symmetric algorithms MUST NOT be present.
* `client_attestation_pop_signing_alg_values_supported`: OPTIONAL. JSON array containing a list of the JWS `alg` values (as defined in {{IANA.JOSE.ALGS}}) supported by the Client for signing the Client Attestation PoP JWT. The values `none` and any symmetric algorithms MUST NOT be present.
* `client_attestation_pop_methods_supported`: OPTIONAL. JSON array of case-sensitive strings, each identifying a Proof of Possession method supported by the Client, as registered in the "OAuth Client Attestation Proof-of-Possession Methods" registry established by this specification (see [](#pop-methods)).

These client metadata values are advertisements of Client capability. The Authorization Server or Resource Server enforces its own accepted algorithm and Proof of Possession method policies independently, and is not required to consult these values when validating an incoming request.

# Implementation Considerations

## DPoP Combined Mode Considerations

When using DPoP combined mode, the key used for client authentication and token binding is shared. This may be undesirable depending on the deployment considerations of the Client. Conversely, the benefits of this approach are as follows:

* It authenticates (attests) the DPoP key used for sender-constraining tokens against the Client deployment.
* It reduces implementation complexity for the Client by minimizing the number of JWTs that need to be constructed or validated in a request.
* It reduces run-time costs for the Client by minimizing the number of cryptographic operations that need to be constructed in a request, especially if the keys are in a remote and/or hardware-backed key storage.

## Reuse of a Client Attestation JWT

Implementers should be aware that the design of this authentication mechanism deliberately allows for a Client Instance to re-use a single Client Attestation JWT in multiple interactions/requests with an Authorization Server or Resource Server, whilst producing a fresh Client Attestation PoP JWT. Client deployments should consider this when determining the validity period for issued Client Attestation JWTs as this ultimately controls how long a Client Instance can re-use a single Client Attestation JWT.

## Refresh token binding

Authorization servers issuing a refresh token in response to a token request using the client attestation mechanism as defined by this draft MUST bind the refresh token to the Client Instance and its associated public key, and NOT just the client as specified in {{Section 6 of RFC6749}}. To prove this binding, the Client Instance MUST use the client attestation mechanism when refreshing an access token. The client MUST also use the same key that was present in the "cnf" claim of the client attestation that was used when the refresh token was issued.

## Binding of OAuth protocol artifacts

Authorization servers using Attestation-Based Client Authentication are RECOMMENDED to bind relevant protocol artifacts to the Client Instance and its associated public key where possible, and NOT just the client as specified in {{RFC6749}}. Note that this only applies if Attestation-Based Client Authentication is used as Client Authentication. Examples of these artifacts include but are not limited to:

- The authorization_code as specified in {{Section 4.1 of RFC6749}}.
- The auth_req_id as specified in section 7.3 {{CIBA}}.

How this binding is established and then proven is specific to the protocol artifact. For example establishing binding to an authorization_code involves the client instance using client attestation before the user is redirected to the Authorization Endpoint (for example by using PAR, {{RFC9126}}), and proving binding of the authorization_code to the Client Instance involves using the client attestation mechanism to authenticate at the token endpoint when performing the authorization code grant.

## Web Server Default Maximum HTTP Header Sizes

Because the Client Attestation and Client Attestation PoP are communicated using HTTP headers, implementers should consider that web servers may have a default maximum HTTP header size configured which could be too low to allow conveying a Client Attestation and or Client Attestation PoP in an HTTP request. It should be noted, that this limit is not given by the HTTP {{RFC9112}}, but instead web server implementations commonly set a default maximum size for HTTP headers. As of 2024, typical limits for modern web servers configure maximum HTTP headers as 8 kB or more as a default.

## Rotation of Client Instance Key

This specification does not provide a mechanism to rotate the Client Instance Key in the Client Attestation JWT's "cnf" claim. If the Client Instance needs to use a new Client Instance Key for any reason, then it MUST request a new Client Attestation JWT from its Client Attester.

## Replay Attack Detection {#implementation-consideration-replay}

Authorization Server or Resource Servers implementing measures to detect replay attacks as described in [](#security-consideration-replay) require efficient data structures to manage large amounts of `challenge` or `jti` values for use cases with high volumes of transactions. To limit the size of the data structure, the Authorization Server or Resource Server should use a sliding window, allowing Client Attestation PoPs within a certain time window, in which the seen `challenge` or `jti` values are stored, but discarded afterwards. The allowed window is determined by the `iat` of the Client Attestation PoP and the sliding window time duration chosen by the Authorization Server or Resource Server. To ensure security, the Authorization Server or Resource Server MUST first evaluate the `iat` of the Client Attestation PoP and reject any Client Attestation PoP whose `iat` falls outside this time window. Using such a data structure, the Authorization Server or Resource Server performs the following operations:

- search for the `challenge` or `jti` value of the Client Attestation PoP to validate whether it has been previously seen, and reject the Client Attestation PoP if it has
- insert the `challenge` or `jti` value of the Client Attestation PoP once it has passed all other checks
- delete `challenge` or `jti` values after they have passed the sliding time window

A trie (also called prefix tree), or a patricia trie (also called radix tree) are RECOMMENDED data structures to implement such a mechanism. Note that this seen-values mechanism is only needed when replay detection relies on a `jti` value or on a `challenge` obtained from the challenge endpoint. When the Authorization Server or Resource Server issues a challenge bound to a specific Client Instance session (see [](#security-consideration-replay)), it can instead validate the Client Attestation PoP against the single challenge value expected for that session, without maintaining a seen-values data structure.

## Trust Management and Key Resolution

The mechanisms by which the Authorization Server establishes trust in the Client Attester, and by which it obtains the public keys used to verify Client Attestation JWTs, are out of scope of this specification.

Attestation-Based Client Authentication protects the integrity of Client Attestations using either Message Authentication Codes (MACs) or digital signatures. When digital signatures are used, the Authorization Server needs to be able to obtain the corresponding public key, either through pre-configuration or through dynamic discovery.

Examples of trust management approaches include:

- Public Key Infrastructure (PKI) and trust lists.
- Pre-shared or out-of-band negotiated configuration (e.g., keys, URLs).

Specifications, profiles, and ecosystems built on top of Attestation-Based Client Authentication SHOULD adopt one of the following mechanisms to resolve the public key used to verify a Client Attestation JWT:

- The `x5c` header parameter, as defined in {{Section 4.1.6 of RFC7515}}, conveys an X.509 certificate chain in the JOSE header of each Client Attestation. Trust is established by validating the chain against a configured trust anchor.
- The `kid` header parameter combined with the `jku` header parameter, as defined in {{Section 4.1.2 of RFC7515}} and {{Section 4.1.3 of RFC7515}}. The Authorization Server retrieves a JWK Set from the URL indicated by `jku` and selects the key identified by `kid`. This approach is self-contained but requires an additional HTTP request, and trust must be established in the `jku` URL.
- The `kid` header parameter combined with Client Metadata or other pre-shared information. Client Metadata, as defined in {{RFC7591}}, includes a `jwks_uri` parameter which, together with `kid`, enables resolution of the verification key.

# Privacy Considerations

## Client Instance Tracking Across Authorization Servers or Resource Servers

Implementers should be aware that using the same client attestation across multiple Authorization Servers or Resource Servers could result in correlation of the end user using the Client Instance through claim values (including the Client Instance Key in the `cnf` claim). Client deployments are therefore RECOMMENDED to use different Client Attestation JWTs with different Client Instance Keys across different Authorization Servers or Resource Servers.

# Security Considerations

The guidance provided by {{RFC7519}} and {{RFC8725}} applies.

## Replay Attacks {#security-consideration-replay}

An Authorization/Resource Server SHOULD implement measures to detect replay attacks by the Client Instance. In the context of this specification, this means to detect that an attacker is resending the same Client Attestation PoP JWT in multiple requests. The following options are RECOMMENDED for this client authentication method:

- The Authorization/Resource Server manages a list of witnessed `jti` values of the Client Attestation PoP JWT for the time window of which the JWT would be considered valid. This sliding time window is based on the `iat` of the Client Attestation PoP and the duration chosen by the Authorization/Resource Server. If any Client Attestation PoP JWT would be replayed, the Authorization/Resource Server would recognize the `jti` value in the list and respond with an authentication error. Details how to implement such a data structure to maintain `jti` values is given in [](#implementation-consideration-replay).
- The Authorization/Resource Server provides a challenge as an `OAuth-Client-Attestation-Challenge` in the challenge endpoint to the Client Instance and the Client uses it as a `challenge` value in the Client Attestation PoP JWT. The Authorization/Resource Server may choose to:
  - manage a list of witnessed `challenge` values, similar to the previously described `jti` approach. Details how to implement such a data structure to maintain `challenge` values is given in [](#implementation-consideration-replay). This guarantees stronger replay protection with a challenge chosen by the Authorization/Resource Server itself, at the potential cost of an additional round-trip.
  - use self-contained challenges while not storing the seen challenges. This approach scales well, while only guaranteeing freshness, but no replay protection within the limited time-window chosen by the Authorization/Resource Server.
- The Authorization/Resource Server generates a challenge that is bound to the Client Instance's session, such that a specific `challenge` in the Client Attestation PoP JWT is expected and validated. The Authorization/Resource Server sends the challenge as part of another previous response to the Client Instance.

Note that protocols that provide a challenge as part of a previous response should provide a clear indicator for clients when this feature is used. This makes it easier for client implementations to deal with proper state handling. This can be implicit by always mandating support for this feature or via some metadata that allows the client to detect support for this feature for a specific server.

Because clock skews between servers and clients may be large, Authorization/Resource Servers MAY limit Client Attestation PoP lifetimes by using server-provided challenge values containing the time at the server rather than comparing the client-supplied iat time to the time at the server. Challenges created in this way yield the same result even in the face of arbitrarily large clock skews.

In any case the Authorization/Resource Server SHOULD ensure the freshness of the Client Attestation PoP by checking either the iat claim or if present the server provided challenge, is within an acceptable time window.

The approach using a challenge explicitly provided by the Authorization/Resource Server gives stronger replay attack detection guarantees, however support by the Authorization/Resource Server is OPTIONAL to simplify mandatory implementation requirements. The `jti` value is mandatory and hence acts as a default fallback.

## Client Attestation Protection

This specification allows both, digital signatures using asymmetric cryptography, and Message Authentication Codes (MAC) to be used to protect Client Attestation JWTs. Implementers should only use MACs to secure the integrity of Client Attestation JWTs if they fully understand the risks of MACs when compared to digital signatures and especially the requirements of their use-case scenarios.
These use-cases typically represent deployments where the Client Attester and Authorization Server have a trust relationship and the possibility to securely exchange keys out of band or are the same entity and no other entity needs to verify the Client Attestations. We expect most deployments to use digital signatures for the protection of Client Attestations, and implementers SHOULD default to digital signatures if they are unsure.

# Relation to RATS

The Remote Attestation Procedures (RATS) architecture defined by {{RFC9334}} has some commonalities to this document. The flow specified in this specification relates to the "Passport Model" in RATS. However, while the RATS ecosystem gives explicit methods and values how the RATS Attester proves itself to the Verifier, this is deliberately out of scope for Attestation-Based Client Authentication. Additionally, the terminology between RATS and OAuth is different:

- a RATS "Attester" relates to an OAuth "Client"
- a RATS "Relying Party" relates to an OAuth "Authorization Server or Resource Server"
- a RATS "Verifier" relates to the "Client Attester" defined in this specification
- a RATS "Attestation Result" relates to the "Client Attestation JWT" defined by this specification
- a RATS "Endorser", "Reference Value Provider", "Endorsement", "Evidence" and "Policies and Reference Values" are out of scope for this specification

# IANA Considerations

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

* Metadata Name: challenge_endpoint
* Metadata Description: URL of the authorization server's challenge endpoint which is used to obtain a fresh challenge for usage in client authentication methods such as client attestation.
* Change Controller: IETF
* Reference: [](#challenge-endpoint) of this specification

<br/>

* Metadata Name: client_attestation_signing_alg_values_supported
* Metadata Description: JSON array containing a list of the JWS signing algorithms supported by the authorization server for the signature on the Client Attestation JWT.
* Change Controller: IETF
* Reference: [](#as-metadata) of this specification

<br/>

* Metadata Name: client_attestation_pop_signing_alg_values_supported
* Metadata Description: JSON array containing a list of the JWS signing algorithms supported by the authorization server for the signature on the Client Attestation PoP JWT.
* Change Controller: IETF
* Reference: [](#as-metadata) of this specification

## OAuth Protected Resource Metadata Registration

This specification requests registration of the following values in the IANA "OAuth Protected Resource Metadata" registry of {{IANA.OAuth.Params}} established by {{RFC9728}}.

* Metadata Name: challenge_endpoint
* Metadata Description: URL of the protected resource's challenge endpoint which is used to obtain a fresh challenge for usage in client authentication methods such as client attestation.
* Change Controller: IETF
* Reference: [](#challenge-endpoint) of this specification

<br/>

* Metadata Name: client_attestation_pop_methods_supported
* Metadata Description: JSON array of strings, each identifying a Proof of Possession method the authorization server accepts when requiring Clients to present a Client Attestation as an additional security signal. If omitted, presenting a Client Attestation is not required.
* Change Controller: IETF
* Reference: [](#additional-security-signal) of this specification

## OAuth Protected Resource Metadata Registration

This specification requests registration of the following value in the IANA "OAuth Protected Resource Metadata" registry of {{IANA.OAuth.Params}} established by {{RFC9728}}.

* Metadata Name: client_attestation_pop_methods_supported
* Metadata Description: JSON array of strings, each identifying a Proof of Possession method the protected resource accepts when requiring Clients to present a Client Attestation as an additional security signal. If omitted, presenting a Client Attestation is not required.
* Change Controller: IETF
* Reference: [](#additional-security-signal) of this specification

## OAuth Dynamic Client Registration Metadata Registration

This specification requests registration of the following values in the IANA "OAuth Dynamic Client Registration Metadata" registry of {{IANA.OAuth.Params}} established by {{RFC7591}}.

* Metadata Name: client_attestation_signing_alg_values_supported
* Metadata Description: JSON array containing a list of the JWS signing algorithms supported by the Client for signing the Client Attestation JWT.
* Change Controller: IETF
* Reference: [](#client-metadata) of this specification

<br/>

* Metadata Name: client_attestation_pop_signing_alg_values_supported
* Metadata Description: JSON array containing a list of the JWS signing algorithms supported by the Client for signing the Client Attestation PoP JWT.
* Change Controller: IETF
* Reference: [](#client-metadata) of this specification

<br/>

* Metadata Name: client_attestation_pop_methods_supported
* Metadata Description: JSON array of strings, each identifying a Proof of Possession method supported by the Client.
* Change Controller: IETF
* Reference: [](#client-metadata) of this specification

## OAuth Client Attestation Proof-of-Possession Methods Registry {#pop-methods}

This specification establishes the IANA "OAuth Client Attestation Proof-of-Possession Methods" registry. This registry lists the Proof of Possession methods that a Client may use to demonstrate possession of the Client Instance Key, referenced by the `client_attestation_pop_methods_supported` metadata parameter defined in [](#additional-security-signal).

Client Attestation Proof-of-Possession Methods are registered by Specification Required {{RFC8126}} after a two-week review period on the oauth-ext-review@ietf.org mailing list, on the advice of one or more Designated Experts. To allow for the allocation of values prior to publication of the final version of a specification, the designated experts may approve registration once they are satisfied that the specification will be completed and published. However, if the specification is not completed and published in a timely manner, as determined by the designated experts, the designated experts may request that IANA withdraw the registration.

Registration requests sent to the mailing list for review should use an appropriate subject (e.g., "Request to register Client Attestation PoP: example").

Within the review period, the designated experts will either approve or deny the registration request, communicating this decision to the review list and IANA. Denials should include an explanation and, if applicable, suggestions as to how to make the request successful. If the designated experts are not responsive, the registration requesters should contact IANA to escalate the process.

Designated experts should apply at least the following criteria when reviewing proposed registrations:

- the mechanism should not duplicate existing functionality
- the mechanism is likely generally applicable, as opposed to being used for a single application
- the specification sufficiently describes how the Proof of Possession method works in combination with a Client Attestation

IANA must only accept registry updates from the designated experts and should direct all requests for registration to the review mailing list.

In order to enable broadly informed review of registration decisions, there should be multiple designated experts to represent the perspectives of different applications using this specification. In cases where registration may be perceived as a conflict of interest for a particular expert, that expert should defer to the judgment of the other experts.

The mailing list is used to enable public review of registration requests, which enables both designated experts and other interested parties to provide feedback on proposed registrations. Designated experts may allocate values prior to publication of the final specification. This allows authors to receive guidance from the designated experts early, so any identified issues can be fixed before the final specification is published.

### Registration Template

* Method Name: The name of the Proof of Possession method, a case-sensitive ASCII string.
* Method Description: A brief description of the mechanism.
* Change Controller: For values registered by this specification, IETF.
* Reference: A reference to the specification that defines the mechanism.

### Initial Registry Content

* Method Name: attestation_pop_jwt
* Method Description: The Proof of Possession is a dedicated Client Attestation PoP JWT ("normal mode").
* Change Controller: IETF
* Reference: [](#client-attestation-pop-jwt) of this specification

<br/>

* Method Name: dpop_combined
* Method Description: The Proof of Possession is a DPoP proof serving as the combined Proof of Possession ("DPoP combined mode").
* Change Controller: IETF
* Reference: [](#dpop-combined-mode) of this specification

<br/>

* Method Name: none
* Method Description: No Client Attestation is required. When a server includes this value, the Client MAY omit the Client Attestation.
* Change Controller: IETF
* Reference: [](#additional-security-signal) of this specification

## Registration of attest_jwt_client_auth Token Endpoint Authentication Method

This section registers the value "attest_jwt_client_auth" in the IANA "OAuth Token Endpoint Authentication Methods" registry established by OAuth 2.0 Dynamic Client Registration Protocol {{RFC7591}}.

* Token Endpoint Authentication Method Name: "attest_jwt_client_auth"
* Change Controller: IESG
* Specification Document(s): [](#as-metadata) of this specification

## Registration of attest_jwt_client_auth_dpop Token Endpoint Authentication Method

This section registers the value "attest_jwt_client_auth_dpop" in the IANA "OAuth Token Endpoint Authentication Methods" registry established by OAuth 2.0 Dynamic Client Registration Protocol {{RFC7591}}.

* Token Endpoint Authentication Method Name: "attest_jwt_client_auth_dpop"
* Change Controller: IESG
* Specification Document(s): [](#dpop-combined-mode) of this specification

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
* Reference: [](#challenges) of this specification
--- back

# Document History

-11

* add Client Metadata section defining `client_attestation_signing_alg_values_supported`, `client_attestation_pop_signing_alg_values_supported`, and `client_attestation_pop_methods_supported` for use by Clients (addresses #170)
* register the new client metadata parameters in the "OAuth Dynamic Client Registration Metadata" IANA registry

-10

* add `client_attestation_pop_methods_supported` Authorization Server and Resource Server metadata
* establish the "OAuth Client Attestation Proof-of-Possession Methods" registry
* allow proof of possession mechanisms defined by other/future specifications
* clarify that DPoP can be used alongside `attest_jwt_client_auth` and which validation rules apply
* add short note that dpop_jkt cannot be used with the combined mode
* update Client Attestation PoP JWT examples to use `challenge` instead of `nonce` and include the required `iat` claim
* clean up references
* fix IANA registrations
* editorial fixes
* add clarification on Client Attester
* remove replay attack consideration to reuse existing artifacts as challenge
* clarifications around implementation consideration for replay attack detection

-09

* restructure draft
* add section how to establish trust and resolve keys
* rephrasing of introduction text
* adding challenge request/response to graphic
* restructure and minor fixes to challenge section
* add mentioning or Resource Server, where applicable
* clarify that alg is required for Client Attestation JWT and Client Attestation PoP JWT

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
Giuseppe De Marco,
Joseph Heenan,
Kristina Yasuda,
Micha Kraus,
Michael B. Jones,
Takahiko Kawasaki,
Timo Glastra
and
Torsten Lodderstedt
for their valuable contributions to this specification.
