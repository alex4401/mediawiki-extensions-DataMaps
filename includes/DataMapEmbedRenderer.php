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
            throw new InvalidArgumentException("Icon specified for a marker group, but file does not exist: $title");
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
        $info = $this->data->groups->$name;
        if ($info == null) {
            throw new InvalidArgumentException("Marker group not declared: $name");
        }

        return array(
            'name' => $info->name,
            'icon' => $this->getIconUrl($info->icon),
        );
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