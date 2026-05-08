import urllib.request
import json
import base64

header = base64.b64encode(b'{"alg":"HS256","typ":"JWT"}').decode()
payload = base64.b64encode(b'{"sub":"1","role":"STAFF","exp":9999999999}').decode()
token = f"{header}.{payload}.fakedsignature"

# Let's hit the endpoint to trigger the error and print the error 
# Or if security blocks fake token, we need a real token.
