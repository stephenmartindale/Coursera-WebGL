import sys, os, base64;

filename = sys.argv[1];

with open(filename, 'rb') as file:

    encoded = base64.b64encode(open(filename, "rb").read());
    print (encoded);
