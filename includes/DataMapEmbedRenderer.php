<?php
use MediaWiki\MediaWikiServices;

class DataMapEmbedRenderer {
    protected Title $title;
    public object $data;
    protected File $image;

    public function __construct( Title $title, object $data ) {
        $this->title = $title;
        $this->data = $data;
		$this->image = MediaWikiServices::getInstance()->getRepoGroup()->findFile( trim( $this->data->image ) );
    }

    public function getId(): int {
        return $this->title->getArticleID();
    }

    private function getIconUrl(string $title): string {
        $file = MediaWikiServices::getInstance()->getRepoGroup()->findFile( trim( $title ) );
        if (!$file || !$file->exists()) {
            throw new InvalidArgumentException("Icon specified for a marker group, but file [[File:$title]] does not exist.");
        }
		return $file->getURL();
    }

    public function getJsConfigVariables(): array {
        [$usedGroups, $usedLayers] = $this->getUsedMarkerTypes();
        return [
            'pageName' => $this->title->getPrefixedText(),
            'version' => $this->title->getLatestRevID(),
            'image' => $this->image->getURL(),
            'imageBounds' => [ $this->image->getWidth(), $this->image->getHeight() ],
            'coordinateBounds' => $this->data->coordinateBounds,
            'groups' => $this->getMarkerGroupsConfigsFor($usedGroups),
            //'layers' => $this->array_map_kv('getMarkerLayerConfig', $usedLayers),
        ];
    }

    public function getUsedMarkerTypes(): array {
        $groups = array();
        $specifiers = array();
        foreach (array_keys(get_object_vars($this->data->markers)) as &$name) {
            $parts = explode(' ', $name);
            $groups[] = array_shift($parts);
            $specifiers += $parts;
        }
        return [array_unique($groups), array_unique($specifiers)];
    }

    public function getMarkerGroupsConfigsFor($names): array {
        $results = array();
        foreach ($names as &$name) {
            $results[$name] = $this->getMarkerGroupConfig($name);
        }
        return $results;
    }

    public function getMarkerGroupConfig(string $name): array {
        $out = array();
        $info = $this->data->groups->$name;
        if ($info == null) {
            throw new InvalidArgumentException("Marker group not declared: $name");
        }

        $out['name'] = $info->name == null ? wfMessage('datamap-unnamed-marker') : $info->name;
        $out['size'] = $info->size == null ? 4 : $info->size;

        if ($info->color != null) {
            $out['color'] = $info->color;
        }

        $legendIconName = $info->legendIcon == null ? $info->icon : $info->legendIcon;
        $markerIconName = $info->markerIcon == null ? $info->icon : $info->markerIcon;
        $legendIconName = $legendIconName == null ? $markerIconName : $legendIconName;

        if ($markerIconName != null) {
            $out['markerIcon'] = $this->getIconUrl($markerIconName);
        }
        if ($legendIconName != null) {
            $out['legendIcon'] = $this->getIconUrl($legendIconName);
        }

        if ($info->custom != null) {
            $out['custom'] = $info->custom;
        }

        if (!array_key_exists('markerIcon', $out) && !array_key_exists('color', $out)) {
            throw new InvalidArgumentException("No icon or color set for marker group $name.");
        }

        return $out;
    }

    public function getMarkerLayerConfig(string $name): array {
        //$info = $this->data->groups->$name;
        return array(
        );
    }

    public function getModules(): array {
        return array('ext.ark.datamaps.leaflet.core', 'ext.ark.datamaps.leaflet.loader');
    }

    public function getHtml(): string {
		$panel = new OOUI\PanelLayout( [
            'classes' => [ 'datamap-container' ],
			'framed' => true,
			'expanded' => false,
			'padded' => true
		] );
        $panel->appendContent( new OOUI\LabelWidget( [
            'label' => $this->data->title == null ? wfMessage('datamap-unnamed-map') : $this->data->title
        ] ) );

        $layout = new OOUI\Widget( [
            'classes' => [ 'datamap-layout' ]
        ] );
        $panel->appendContent( $layout );

        $legend = new OOUI\Widget( [
            'classes' => [ 'datamap-legend' ]
        ] );
        $legend->appendContent( new OOUI\LabelWidget( [
            'label' => wfMessage('datamap-legend-label')
        ] ) );
        $layout->appendContent( $legend );
        
		$mapPanel = new OOUI\PanelLayout( [
			'framed' => true,
			'expanded' => false,
		] );
        $mapPanel->appendContent( new OOUI\HtmlSnippet( $this->getLeafletContainerHtml() ) );
        $layout->appendContent($mapPanel);

        return $panel;
    }

    public function getLeafletContainerHtml(): string {
		return Html::rawElement(
			'div',
			[
				'id' => 'datamap-' . $this->getId(),
				'class' => 'datamap'
			],
            Html::element(
                'noscript',
                null,
                wfMessage( 'datamap-javascript-disabled' )
            )
            . Html::element(
				'div',
				[
					'class' => 'datamap-status'
				],
				wfMessage( 'datamap-placeholder-loading' )
			)
		);
    }
}