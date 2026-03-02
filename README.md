# OAuth 2.0 Attestation-Based Client Authentication

This is the working area for the IETF [OAUTH Working Group](https://datatracker.ietf.org/group/oauth/documents/) Internet-Draft, "OAuth 2.0 Attestation-Based Client Authentication".

* [Editor's Copy](https://oauth-wg.github.io/draft-ietf-oauth-attestation-based-client-auth/#go.draft-ietf-oauth-attestation-based-client-auth.html)
* [Datatracker Page](https://datatracker.ietf.org/doc/draft-ietf-oauth-attestation-based-client-auth)
* [Working Group Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-attestation-based-client-auth)
* [Compare Editor's Copy to Working Group Draft](https://oauth-wg.github.io/draft-ietf-oauth-attestation-based-client-auth/#go.draft-ietf-oauth-attestation-based-client-auth.diff)


## Contributing

See the
[guidelines for contributions](https://github.com/oauth-wg/draft-ietf-oauth-attestation-based-client-auth/blob/main/CONTRIBUTING.md).

Contributions can be made by creating pull requests.
The GitHub interface supports creating pull requests using the Edit (✏) button.


## Command Line Usage

Formatted text and HTML versions of the draft can be built using `make`.

```sh
$ make
```

Command line usage requires that you have the necessary software installed.  See
[the instructions](https://github.com/martinthomson/i-d-template/blob/main/doc/SETUP.md).

## Client Attestation Key


```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEVs/o5+uQbTjL3chynL4wXgUg2R9
q9UU8I5mEovUf86QZ7kOBIjJwqnzD1omageEHWwHdBO6B+dFabmdT9POxg==
-----END PUBLIC KEY-----
```

```
-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgevZzL1gdAFr88hb2
OF/2NxApJCzGCEDdfSp6VQO30hyhRANCAAQRWz+jn65BtOMvdyHKcvjBeBSDZH2r
1RTwjmYSi9R/zpBnuQ4EiMnCqfMPWiZqB4QdbAd0E7oH50VpuZ1P087G
-----END PRIVATE KEY-----
```



## PoP Key

```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEVcKVNBZ4IaBAYW3jxM4w3TJFVA7m
yeUGQyGt+g/yvpR/4T6FgTdMBYrCFW/2l6P00AGz1Jf1ew07zTHnuMVPJQ==
-----END PUBLIC KEY-----
```

```json
{
  "kty": "EC",
  "crv": "P-256",
  "x": "VcKVNBZ4IaBAYW3jxM4w3TJFVA7myeUGQyGt-g_yvpQ",
  "y": "f-E-hYE3TAWKwhVv9pej9NABs9SX9XsNO80x57jFTyU"
}
```


```
-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgdMiNeF6fPL4nr2gM
qKwPp7ua8iep0IUr7JnJvGRNST6hRANCAARVwpU0FnghoEBhbePEzjDdMkVUDubJ
5QZDIa36D/K+lH/hPoWBN0wFisIVb/aXo/TQAbPUl/V7DTvNMee4xU8l
-----END PRIVATE KEY-----
```

