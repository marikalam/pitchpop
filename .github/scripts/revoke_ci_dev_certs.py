"""Revokes the Apple Development certificates earlier CI builds left behind.

Each TestFlight build runs on a fresh GitHub Mac. To archive, Xcode creates
a new Apple Development certificate through the App Store Connect API key,
and its private key is thrown away with the machine, so the certificate is
never usable again. Apple allows only a few, so after enough builds the
archive fails with "Your account has reached the maximum number of
certificates". This removes those leftovers before each build.

Only development certificates that Xcode made through the API ("Created via
API") are touched: certificates made on a Mac, and distribution
certificates, are left alone. Revoking a development certificate doesn't
affect TestFlight or App Store builds.

Usage: revoke_ci_dev_certs.py <AuthKey.p8>, with ASC_KEY_ID and
ASC_ISSUER_ID in the environment. Prints no secrets.
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

API = 'https://api.appstoreconnect.apple.com/v1'
DEV_TYPES = {'DEVELOPMENT', 'IOS_DEVELOPMENT'}


def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def der_to_raw(sig):
    # openssl gives an ASN.1 DER ECDSA signature; a JWT (ES256) wants r||s.
    assert sig[0] == 0x30
    i = 2 if sig[1] < 0x80 else 2 + (sig[1] & 0x7F)
    parts = []
    for _ in range(2):
        assert sig[i] == 0x02
        n = sig[i + 1]
        parts.append(sig[i + 2 : i + 2 + n].lstrip(b'\0').rjust(32, b'\0'))
        i += 2 + n
    return b''.join(parts)


def make_token(key_path, key_id, issuer_id):
    header = {'alg': 'ES256', 'kid': key_id, 'typ': 'JWT'}
    now = int(time.time())
    payload = {'iss': issuer_id, 'iat': now, 'exp': now + 600, 'aud': 'appstoreconnect-v1'}
    signing_input = f'{b64url(json.dumps(header).encode())}.{b64url(json.dumps(payload).encode())}'
    der = subprocess.run(
        ['openssl', 'dgst', '-sha256', '-sign', key_path],
        input=signing_input.encode(),
        capture_output=True,
        check=True,
    ).stdout
    return f'{signing_input}.{b64url(der_to_raw(der))}'


def call(method, url, token):
    req = urllib.request.Request(url, method=method, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req, timeout=30) as res:
        body = res.read()
        return json.loads(body) if body else None


def main():
    token = make_token(sys.argv[1], os.environ['ASC_KEY_ID'], os.environ['ASC_ISSUER_ID'])
    certs = []
    url = f'{API}/certificates?limit=200'
    while url:
        page = call('GET', url, token)
        certs += page['data']
        url = page.get('links', {}).get('next')

    for c in certs:
        a = c['attributes']
        print(f"  {a.get('certificateType')}: {a.get('name')} / {a.get('displayName')}, expires {a.get('expirationDate', '')[:10]}")

    leftovers = [
        c
        for c in certs
        if c['attributes'].get('certificateType') in DEV_TYPES
        and 'Created via API' in f"{c['attributes'].get('name', '')} {c['attributes'].get('displayName', '')}"
    ]
    print(f'{len(certs)} certificates; revoking {len(leftovers)} left over from earlier CI builds.')
    for c in leftovers:
        call('DELETE', f"{API}/certificates/{c['id']}", token)


if __name__ == '__main__':
    main()
