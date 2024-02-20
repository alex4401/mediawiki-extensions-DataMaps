import json
import sys
from pydantic import BaseModel, Field, RootModel
from typing import Annotated, Any, Literal, Optional


PROPERTIES = dict(el.split('=', 2) for el in sys.argv if '=' in el)
REV = int(PROPERTIES['REV'])
FRAGMENT = PROPERTIES['FRAGMENT'] != '0'
OUTPUT = PROPERTIES['OUT']


class BaseModelEx(BaseModel):
    class Config:
        extra = 'forbid'
        schema_extra = {'$schema': 'http://json-schema.org/draft-04/schema#'}


##% Literals
class NamedPoint(BaseModelEx):
    x: float
    y: float
Point = tuple[float, float] | NamedPoint
Point1 = float|Point
Box = tuple[Point, Point]
Rgb = str|tuple[int, int, int]
Rgba = str|tuple[int, int, int, int]
NonEmptyString = Annotated[str, Field(min_length=1)]
MultilineString = list[str]|NonEmptyString
LayerId = Annotated[str, Field(min_length=1)]
LayerAssociationStr = Annotated[str, Field(min_length=1)]


##% Structs
class CoordinateSystem(BaseModelEx):
    order: Literal['yx', 'latlon', 'xy'] = Field(
        'yx',
    )
    topLeft: Point = Field(
        (0, 0),
    )
    bottomRight: Point = Field(
        (100, 100),
    )
    rotation: Optional[float] = Field(
        None,
    )
class _Overlay(BaseModelEx):
    name: Optional[str] = Field(None)
class ImageOverlay(_Overlay):
    image: str
    at: Box
    reduceGaps: bool = False
class PolylineOverlay(_Overlay):
    path: list[Point]
    color: Optional[Rgba] = Field(None)
class BoxOverlay(_Overlay):
    at: Box
    color: Optional[Rgba] = Field(None)
    borderColor: Optional[Rgb] = Field(None)
    thickness: Optional[float] = Field(None)
class _Background(BaseModelEx):
    name: Optional[str] = Field(
        None,
        title='Display name',
        description='''
            This name will be shown to a viewer in the background selection dropdown.
        '''
    )
    associatedLayer: Optional[LayerId] = None
    overlays: list[ImageOverlay|PolylineOverlay|BoxOverlay] = Field([])
class ImageBackground(_Background):
    image: str = Field(
        ...,
        title='Image to use'
    )
    at: Optional[Box] = Field(
        None,
        title='Bounds',
        description='''
            Bounds to fit the image in.
        '''
    )
class TiledBackground(_Background):
    at: Point = Field(
        (0, 0),
        title='Starting position of the tile set'
    )
    tileSize: Point1 = Field(
        ...,
        title='Size of an individual tile'
    )
    tiles: list["TiledBackground.Tile"]

    class Tile(BaseModelEx):
        position: Point1 = Field(
            ...,
            title='Position',
            description='''
                Position in this tile in the grid.

                1 unit is one tile as big as the size specified.
            '''
        )
        image: str = Field(
            ...,
            title='Image to use'
        )
class ZoomSettings(BaseModelEx):
    tryFitEverything: bool = Field(
        True, # ZoomSettingsSpec::DEFAULT_AUTO
    )
    min: int = Field(
        0.05,
        lt=24,
        gt=-15,
        title='Minimum level',
    )
    max: int = Field(
        6,
        lt=24,
        gt=-15,
        title='Maximum level',
    )
    lock: bool = Field(
        False,
        title='Locked?',
        description='''
            If set to `true`, zoom level will be fixed at the specified `min` value. All zoom controls on the viewer's
            side will be disabled.
        '''
    )
# DEPRECATED from v17 pending removal in v18, no replacement
LeafletSettings = dict[str, Any]
class Settings(BaseModelEx):
    allowFullscreen: bool = Field(
        True,
        description='''
            Whether full-screen toggle will be shown to the user on this map.

            TODO: "whether the option to view the map in fullscreen will be offered"
        '''
    )
    backdropColor: Optional[Rgb] = Field(
        None,
        description='''
            The backdrop colour, i.e. the one filling areas with no background image over them.

            TODO: wording
        '''
    )
    enableTooltipPopups: bool = Field(
        False,
        description='''
            Whether simply moving mouse cursor over a marker should cause its popup to become visible.

            Such popup will be partially translucent. The user still has to click on the marker for the address bar to update with a
            permanent link.
        '''
    )
    enableSearch: Literal[False, True, 'tabberWide'] = Field(
        True,
        description='''
            Whether marker search will be enabled for this map.

            TODO: document modes
        '''
    )
    hideLegend: bool = Field(
        False,
        description='''
            Forces the legend (collectible checklists and marker filters) to not be loaded on this map.
        '''
    )
    interactionModel: Literal['keybinds', 'sleep'] = Field(
        'keybinds',
        description='''
            Changes interaction delay model. Keybinds require extra keys to be held to zoom in (CTRL/Super), sleep is primarily
            time-based.
        '''
    )
    iconRenderer: Literal['auto', 'DOM', 'canvas'] = Field(
        'auto',
        description='''
            Renderer preference for graphical icons using images from this wiki (not circular icons or pins).

            - DOM renderer provides best reactivity for a small data set (roughly 500 icons), but performance degrades with
              more markers. However, it comes with animation support for GIFs.
            - Canvas renderer provides best performance at a cost of zoom update latency, and supports only static icons. This works
              best for bigger data sets (above 500 icons), and is automatically enabled for such sets (if this option is set to
              'auto').

            Pins always use the DOM renderer.
        '''
    )
    requireCustomMarkerIDs: bool = Field(
        False,
        description='''
            Makes data validation disallow automatically generated marker IDs - the `id` property will need to be specified for each
            marker manually.

            These identifiers are used for persistent links and collectible progress tracking. By default, group and layers the marker
            is attached to along with its location on map are used to generate the identifier.
        '''
    )
    showCoordinates: bool = Field(
        True,
        title='Show coordinates?',
        description='''
            Whether coordinates from under the mouse cursor will be shown on this map in the bottom-left corner.
        '''
    )
    sortChecklistsBy: Literal['groupDeclaration', 'amount'] = Field(
        'groupDeclaration',
        title='Checklist sort order',
        description='''
            Specifies marker group checklist sort order.

            - 'groupDeclaration': Follows the order in which marker groups are declared in source data.
            - 'amount':           Follows the number of markers inside each group.
        '''
    )
    zoom: Optional[ZoomSettings] = Field(
        None,
        title='Zoom configuration'
    )
    leaflet: LeafletSettings = Field(
        False,
        title='Custom Leaflet parameters',
        description='''
            Check https://leafletjs.com/reference.html#map-option for reference. Some options are not supported.
        '''
    )
class _BaseMarkerGroup(BaseModelEx):
    name: NonEmptyString
    description: Optional[NonEmptyString] = Field(
        None,
        title='Description',
        description='''
            Shown in the legend right under.
        '''
    )
    icon: Optional[str] = Field(
        None,
        title='Icon',
        description='''
            Shown in the legend.
        '''
    )
    article: Optional[str] = Field(
        None,
        title='Related article',
        description='''
            If set, all markers in this group will link to this article.
        '''
    )
    isDefault: bool = True
    isCollectible: Literal[False, True, 'individual', 'group', 'globalGroup'] = False
    autoNumberInChecklist: bool = False
    canSearchFor: bool = True
class CircularMarkerGroup(_BaseMarkerGroup):
    fillColor: Rgb
    size: float = 5
    extraMinZoomSize: Optional[float] = None
    strokeColor: Optional[Rgb] = None
    strokeWidth: float = 1
class PinMarkerGroup(_BaseMarkerGroup):
    pinColor: Rgb
    size: float = 32
    strokeColor: Optional[Rgb] = None
    strokeWidth: float = 1
class IconMarkerGroup(_BaseMarkerGroup):
    icon: str
    size: float|Point1 = 32
class MarkerCategory(BaseModelEx):
    name: Optional[NonEmptyString] = None
    subtleText: Optional[str] = None
    overrideIcon: Optional[str] = None
class _Marker(BaseModelEx):
    id: Optional[NonEmptyString|int] = None
    icon: Optional[str] = None
    scale: float = 1.0
    name: Optional[NonEmptyString] = None
    description: Optional[MultilineString] = None
    isWikitext: Literal[None, False, True] = None
    image: Optional[str] = None
    article: Optional[NonEmptyString] = None
    canSearchFor: bool = True
    searchKeywords: list[tuple[NonEmptyString, float]]|NonEmptyString = []
class LatLonMarker(_Marker):
    lat: float
    lon: float
class XyMarker(_Marker):
    x: float
    y: float


##% Main
class _DataMap(BaseModelEx):
    #if FRAGMENT:
    isFragment: bool = Field(False, alias='$fragment')
    #if not FRAGMENT:
    include: Optional[list[str]] = Field(
        None,
        description='List of fragments that must be imported.'
    )
    crs: CoordinateSystem | Box = Field(
        ((0, 0), (100, 100)),
    )
    settings: Optional[Settings] = Field(
        None,
    )
    groups: dict[LayerId, CircularMarkerGroup|PinMarkerGroup|IconMarkerGroup] = dict()
    categories: dict[LayerId, MarkerCategory] = dict()
    disclaimer: Optional[NonEmptyString] = None
    markers: dict[LayerAssociationStr, list[LatLonMarker|XyMarker]] = dict()
    custom: Optional[dict[str, Any]] = None
class SingleBackgroundDataMap(_DataMap):
    background: str|ImageBackground|TiledBackground
class MultiBackgroundDataMap(_DataMap):
    backgrounds: list[ImageBackground|TiledBackground]

##% Write to file
schema = RootModel[SingleBackgroundDataMap|MultiBackgroundDataMap].model_json_schema()
with open(OUTPUT, 'wt') as fp:
    json.dump(schema, fp, indent="\t")
