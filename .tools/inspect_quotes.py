s=open('COMMIT_READY.ps1','rb').read().decode('utf-8','replace')
print('len',len(s))
print('@" count', s.count('@"'))
print("@' count", s.count("@'"))
print('double quote count', s.count('"'))
print('single quote count', s.count("'"))
# naive per-line double quote parity
for i,l in enumerate(s.splitlines(), start=1):
    dq=l.count('"')
    if dq%2==1:
        print('odd doublequote line',i)
        break
else:
    print('no odd doublequote lines')