import json
import sys
import requests
from collections import defaultdict


fWiki = sys.argv[1]
fimTitle = sys.argv[2]
dmName = sys.argv[3]


NO_CONVERSION_PROPS = ( 'defaultSort', 'pageCategories' )


def copyNonNull(source, sourceName, target, targetName) -> bool:
    if source.get(sourceName, None):
        target[targetName] = source[sourceName] 
        return True
    return False


request = requests.get(f'https://{fWiki}/wiki/Map:{fimTitle}?action=raw')
if request.status_code != 200:
    print('Status code of', request.status_code, 'failed to download source data')
    sys.exit(1)
fimInput = request.json()


dmOutput = dict(
    title=fimTitle,
    image=fimInput['mapImage'],
    groups=dict(),
    markers=defaultdict(lambda: list())
)


for prop in NO_CONVERSION_PROPS:
    value = fimInput.get(prop, None)
    if value:
        print(f'{prop} will not be converted and requires manual intervention: {value}')


if fimInput.get('useMarkerClustering', True):
    print('Marker clustering is enabled, this is not supported by Data Maps')


coordOrder = fimInput['coordinateOrder']
coordSpace = fimInput['mapBounds']
fimMaxX, fimMaxY = coordSpace[1]
coordOrigin = fimInput['origin']


print(f'Coordinate space is {coordSpace}')
print(f'Coordinate space conversion will be done as currently Data Maps do not support custom coordinate spaces. This results in accuracy loss.')

translateXy = coordOrder != 'yx'
translateLat = coordOrigin != 'bottom-left'

if not translateXy:
    print(f'Coordinate order is {coordOrder}, YX translation skipped')
else:
    print(f'Coordinate order is {coordOrder}, YX translation required')

if not translateLat:
    print(f'Coordinate origin is {coordOrigin}, latitude translation skipped')
else:
    print(f'Coordinate origin is {coordOrigin}, latitude translation required')


categoryMap = dict()
for fimCategory in fimInput['categories']:
    name = fimCategory['name']
    dmInternalId = name.replace(' ', '')
    if int(fimCategory['id']) != int(fimCategory['listId']):
        print(f'Category {name} has unmatching IDs and may cause output to turn invalid')
    
    if fimCategory.get('symbol', None) or fimCategory.get('symbolColor', None):
        print(f'Category {name} uses symbol properties and requires manual intervention')
    
    dmCatOutput = dict(name=name, color=fimCategory['color'], size=6)

    if copyNonNull(fimCategory, 'icon', dmCatOutput, 'icon'):
        dmCatOutput['icon'] = dmCatOutput['icon'].replace('File:', '')
        dmCatOutput['size'] = [40, 40]
        del dmCatOutput['color']

    dmOutput['groups'][dmInternalId] = dmCatOutput
    categoryMap[fimCategory['id']] = dmInternalId


knownArticleLabels = set()
for fimMarker in fimInput['markers']:
    dmCategory = categoryMap[fimMarker['categoryId']]

    y, x = fimMarker['position']
    if translateXy:
        x, y = y, x
    lat = round(y / fimMaxY * 100, 3)
    lon = round(x / fimMaxX * 100, 3)

    lat = 100 - lat

    dmMarker = dict(lat=lat, lon=lon)

    if fimMarker.get('popup', None):
        copyNonNull(fimMarker['popup'], 'title', dmMarker, 'label')
        copyNonNull(fimMarker['popup'], 'description', dmMarker, 'description')

        if fimMarker['popup'].get('link', None):
            fimLink = fimMarker['popup']['link']
            if fimLink['label'] not in knownArticleLabels:
                print(f'Marker found with an article link labelled {fimLink["label"]}, this requires manual intervention')
                knownArticleLabels.add(fimLink['label'])
            dmMarker['article'] = fimLink['url']

    dmOutput['markers'][dmCategory].append(dmMarker)


for dmCategoryName, markerSet in dmOutput['markers'].items():
    cArticle = next(x['article'] for x in markerSet if 'article' in x)
    if all(x.get('article', None) == cArticle for x in markerSet):
        print(f'All markers in {dmCategoryName} have the same article link, deduplicating')
        dmOutput['groups'][dmCategoryName]['article'] = cArticle
        for dmMarker in markerSet:
            del dmMarker['article']


with open(dmName, 'wt') as fp:
    print('Conversion results saved to', dmName)
    json.dump(dmOutput, fp, ensure_ascii=False, indent='\t')