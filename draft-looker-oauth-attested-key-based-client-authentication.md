---
title: "OAuth2 Attested Key Based Client Authentication"
category: info

docname: draft-looker-oauth-attested-key-based-client-authentication-latest
submissiontype: IETF  # also: "independent", "IAB", or "IRTF"
number:
date:
v: 3
area: "Security"
workgroup: "Web Authorization Protocol"
venue:
  group: "Web Authorization Protocol"
  type: "Working Group"

author:
 -
    fullname: Tobias Looker
    organization: MATTR
    email: tobias.looker@mattr.global

normative:
  RFC3986: RFC3986
  RFC7800: RFC7800
  RFC7638: RFC7638
  DPOP:
    title: "OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)"
    author:
      -
        ins: D. Fett
        name: Daniel Fett
      -
        ins: B. Campbell
        name: Brian Campbell
      -
        ins: J. Bradley
        name: John Bradley
      -
        ins: T. Lodderstedt
        name: Torsten Lodderstedt
      -
        ins: M. Jones
        name: Mike Jones
      -
        ins: D. Waite
        name: Daniel Waite
informative:
  RFC6749: RFC6749
  RFC7523: RFC7523


--- abstract

This specification defines a new method of client authentication for OAuth2 {{RFC6749}} by extending the approach defined in {{RFC7523}}. This new method enables client deployments that are traditionally viewed as public clients to be able to authenticate with the authorization server through an attested key based authentication scheme.

--- middle

# Introduction

{{RFC7523}} defines a way for a client to include an assertion in a token request to an authorization server for the purposes of client authentication. This specification extends this mechanism to provide a way for a client instance to authenticate it self with the authorization server through an attested key based authentication scheme.

The following diagram depicts the conceptual interactions.

~~~ ascii-art

                              (3) Generate Client
                                  Key Attestation
                                  +-------+
                                  |       |
                                  |      \ /
                              +---------------+
                              |               |
                              |               |
                              |    Client     |
                              |    Backend    |
                              |               |
                              |               |
                              +---------------+
                                 / \      |
                                  |       |
                (2) Request       |       |     (4) Repond with
                Client key        |       |     Generated Client
                Attestation       |       |     Key Attestation
                for generated     |       |
                key               |       |
                                  |       |
                                  |      \ /
                              +---------------+                       +---------------+
                              |               |                       |               |
                     +------->|               |<--------------------->|               |
  (1) Generate       |        |    Client     |    (6) Interaction    | Authorization |
  Attestation Key    |        |   Instance    |    using Client       |    Server     |
                     +--------|               |    Attestation        |               |
                              |               |    for authentication |               |
                              +---------------+                       +---------------+
                                 / \      |
                                  |       |
                                  +-------+
                                (5) Generate
                              Key Attestation PoP
~~~

Note defining the protocol for steps 2 and 4, including how the client instance authenticates with the client backend is out of scope of this specification.

This specification only defines the format of the client assertion that a client instance uses to authenticate in its interactions with an authorization server (indicated in step 6), which is comprised of two key parts:

1. A client key attestation - produced by the client backend.
2. A client key attestation proof of possession (PoP) - produced by the client instance.

# Conventions and Definitions

{::boilerplate bcp14-tagged}

# Client Authentication in the Token Request

To perform client authentication using this scheme, the client instance uses the following parameter values and encodings.

The value of the "client_assertion_type" is "urn:ietf:params:oauth:client-assertion-type:jwt-key-attestation".

The value of the "client_assertion" parameter contains two JWTs, separated by a '~' character. It MUST NOT contain more or less than precisely two JWTs seperated by the '~` character. The first JWT MUST be the client key attestation JWT defined in [](#client-key-attestation-jwt), the second JWT MUST the client key attestation PoP defined in [](#client-key-attestation-pop-jwt).

The following example demonstrates client authentication using this scheme during the presentation of an authorization code grant in an access token request (with extra line breaks for display purposes only):

~~~
POST /token.oauth2 HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=n0esc3NRze7LTCu7iYzS6a5acc3f0ogp4&
client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3A
client-assertion-type%3Ajwt-key-attestation&
client_assertion=eyJhbGciOiJSUzI1NiIsImtpZCI6IjIyIn0.
eyJpc3Mi[...omitted for brevity...].
cC4hiUPo[...omitted for brevity...]~eyJzI1NiIsImtphbGciOimtpZCI6IjIyIn0.
IjIyIn0[...omitted for brevity...].
iOiJSUzI1[...omitted for brevity...]
~~~

## JWT Format and Processing Requirements {#jwt-format-and-processing-requirements}

In order to authenticate the client using this scheme, the authorization server MUST validate BOTH the JWTs present in the "client_assertion" parameter according to the criteria below.

### Client Key Attestation JWT {#client-key-attestation-jwt}

The following rules apply to validating the client key attestation JWT. Application of additional restrictions and policy are at the discretion of the authorization server.

1. The JWT MUST contain an "iss" (issuer) claim that contains a unique identifier for the entity that issued the JWT. In the absence of an application profile specifying otherwise, compliant applications MUST compare issuer values using the Simple String Comparison method defined in Section 6.2.1 of {{RFC3986}}.

2. The JWT MUST contain a "sub" (subject) claim with a value corresponding to the "client_id" of the OAuth client.

3. The JWT MUST contain an "exp" (expiration time) claim that limits the time window during which the JWT can be used.  The authorization server MUST reject any JWT with an expiration time that has passed, subject to allowable clock skew between systems.  Note that the authorization server may reject JWTs with an "exp" claim value that is unreasonably far in the future.

4. The JWT MUST contain an "cnf" claim conforming {{RFC7800}} that conveys the key to be used for sender constraining tokens issued by the authorization server. The key MUST be expressed using the "jwk" representation.

5. The JWT MAY contain an "nbf" (not before) claim that identifies the time before which the token MUST NOT be accepted for processing.

6. The JWT MAY contain an "iat" (issued at) claim that identifies the time at which the JWT was issued.  Note that the authorization server may reject JWTs with an "iat" claim value that is unreasonably far in the past.

7. The JWT MAY contain a "jti" (JWT ID) claim that provides a unique identifier for the token.  The authorization server MAY ensure that JWTs are not replayed by maintaining the set of used "jti" values for the length of time for which the JWT would be considered valid based on the applicable "exp" instant.

8. The JWT MAY contain other claims.

9. The JWT MUST be digitally signed or have a Message Authentication Code (MAC) applied by the issuer.  The authorization server MUST reject JWTs with an invalid signature or MAC.

10. The authorization server MUST reject a JWT that is not valid in all other respects per "JSON Web Token (JWT)".

The following example is the decoded header and payload of a JWT meeting the processing rules as defined above.

~~~
{
  "alg": "ES256",
  "kid": "11"
}
.
{
  "iss": "https://client.example.com",
  "sub": "https://client.example.com",
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
~~~

### Client Key Attestation PoP JWT {#client-key-attestation-pop-jwt}

The following rules apply to validating the client key attestation PoP JWT. Application of additional restrictions and policy are at the discretion of the authorization server.

1. The JWT MUST contain an "iss" (issuer) claim with a value corresponding to the "client_id" of the OAuth client.

2. The JWT MUST contain an "exp" (expiration time) claim that limits the time window during which the JWT can be used.  The authorization server MUST reject any JWT with an expiration time that has passed, subject to allowable clock skew between systems.  Note that the authorization server may reject JWTs with an "exp" claim value that is unreasonably far in the future.

3. The JWT MAY contain an "nbf" (not before) claim that identifies the time before which the token MUST NOT be accepted for processing.

4. The JWT MAY contain an "iat" (issued at) claim that identifies the time at which the JWT was issued.  Note that the authorization server may reject JWTs with an "iat" claim value that is unreasonably far in the past.

5. The JWT MAY contain a "jti" (JWT ID) claim that provides a unique identifier for the token.  The authorization server MAY ensure that JWTs are not replayed by maintaining the set of used "jti" values for the length of time for which the JWT would be considered valid based on the applicable "exp" instant.

6. The JWT MAY contain other claims.

7. The JWT MUST be digitally signed using an asymmetric cryptographic algorithm. The authorization server MUST reject the JWT if it is using a Message Authentication Code (MAC) based algorithm. The authorization server MUST reject JWTs with an invalid signature.

8. The public key used to verify the JWT MUST be the key located in the "cnf" claim of the corresponding client key attestation JWT.

9. The authorization server MUST reject a JWT that is not valid in all other respects per "JSON Web Token (JWT)".

The following example is the decoded header and payload of a JWT meeting the processing rules as defined above.

~~~
{
  "alg": "ES256"
}
.
{
  "iss": "https://client.example.com",
  "aud": "https://as.example.com",
  "nbf":1300815780,
  "exp":1300819380,
}
~~~


# Security Considerations

TODO Security


# IANA Considerations

This document has no IANA actions.


--- back

# Acknowledgments
{:numbered="false"}

TODO acknowledge.
