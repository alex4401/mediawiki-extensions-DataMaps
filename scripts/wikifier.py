from pathlib import Path

csvs = Path('csv').glob('*.csv')

out = open('ResourceMap.txt', 'wt')

outstrs = set()

COORD_PRECISION = 2

count = 0
for csv in sorted(csvs):
    resource, location, _ = csv.name.rsplit('-', 2)

    if location == 'cave':
        resource += ' cave'

    data = csv.read_text().strip().split('\n')

    print(resource.ljust(20, ' '), len(data), 'nodes')
    count += len(data)
    
    for line in data[1:]:
        lats, longs = line.split(',')

        lat = round(float(lats), COORD_PRECISION)
        long = round(float(longs), COORD_PRECISION)

        outstrs.add(f'| {lat}, {long}, {resource}')

print(count, '\tnodes total')
print(len('\n'.join(outstrs)), '\tbytes')

for string in sorted(outstrs):
    out.write(string)
    out.write('\n')

