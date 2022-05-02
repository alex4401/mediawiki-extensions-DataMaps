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

    private function getImageUrl(): string {
		//if ( $file && $file->exists() ) {
		return $this->image->getURL();
    }

    public function getJsConfigVariables(): array {
        [$usedGroups, $usedLayers] = $this->getUsedMarkerTypes();
        return [
            'pageName' => $this->title->getPrefixedText(),
            'version' => $this->title->getLatestRevID(),
            'image' => $this->getImageUrl(),
            'imageBounds' => [ $this->image->getWidth(), $this->image->getHeight() ],
            'coordinateBounds' => $this->data->coordinateBounds,
            'groups' => $this->getMarkerGroupsConfigsFor($usedGroups),
            //'layers' => $this->array_map_kv('getMarkerLayerConfig', $usedLayers),
        ];
    }

    private function array_map_kv(string $callback, array $array) {
        return array_reduce($array, function (array $results, string $item) {
            $results[$item] = $this->$callback($item);
            return $results;
        }, array());
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
        return array(
            'name' => $info->name,
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