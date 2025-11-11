import os
root = r'D:\SMS\student-management-system'
problem = []
for dirpath, dirnames, filenames in os.walk(root):
    for name in dirnames + filenames:
        p = os.path.join(dirpath, name)
        try:
            os.path.relpath(p, root)
        except Exception as e:
            print('BAD', p, '->', repr(e))
            problem.append((p, repr(e)))
print('Done, found', len(problem), 'problem paths')
