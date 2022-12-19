function AddMarkerDialog( config ) {
    OO.ui.ProcessDialog.call( this, config );
    this.ve = config.ve;
    this.config = config;
}
OO.inheritClass( AddMarkerDialog, OO.ui.ProcessDialog );


AddMarkerDialog.static.name = 'mveAddMarkerDialog';
AddMarkerDialog.static.title = mw.msg( 'datamap-ve-tool-add-marker' );
AddMarkerDialog.static.actions = [
    {
        modes: [ 'final' ],
        action: 'continue',
        label: mw.msg( 'datamap-ve-tool-add-marker-continue' ),
        flags: [ 'primary', 'progressive' ]
    },
    {
        modes: [ 'intro', 'final' ],
        label: mw.msg( 'datamap-ve-cancel' ),
        flags: [ 'safe', 'close' ]
    }
];


function MenuOptionWidget( config ) {
    MenuOptionWidget.super.call( this, config );

    this.data = config.data;
}
OO.inheritClass( MenuOptionWidget, OO.ui.MenuOptionWidget );


AddMarkerDialog.prototype.initialize = function () {
    OO.ui.ProcessDialog.prototype.initialize.apply( this, arguments );

    this.inputBox = new OO.ui.TextInputWidget( {
        placeholder: mw.msg( 'datamap-ve-search-for-group' )
    } );
    this.groupMenu = new OO.ui.MenuSelectWidget( {
        widget: this.inputBox,
        input: this.inputBox,
        $floatableContainer: this.inputBox.$element,
        filterFromInput: true,
        filterMode: 'substring',
        verticalPosition: 'below',
        width: '100%'
    } );
    // TODO: values unscaled by CRS
    const contentCentre = this.ve.map.getCurrentContentBounds().getCenter();
    this.lat = new OO.ui.TextInputWidget( {
        type: 'number',
        value: this.config.lat || contentCentre.lat
    } );
    this.lon = new OO.ui.TextInputWidget( {
        type: 'number',
        value: this.config.lon || contentCentre.lng
    } );
    this.submitButton = new OO.ui.ButtonInputWidget( {
        label: mw.msg( 'datamap-ve-create' ),
        flags: [ 'primary', 'progressive' ],
        disabled: true
    } );

    this.panel = new OO.ui.PanelLayout( {
        framed: false,
        expanded: false,
        padded: true,
        content: [
            $( '<p>' ).text( mw.msg( 'datamap-ve-tool-add-marker-intro' ) ),
            new OO.ui.FormLayout( {
                items: [
                    new OO.ui.FieldsetLayout( {
                        items: [
                            this.inputBox,
                            new OO.ui.PanelLayout( {
                                expanded: false,
                                content: [
                                    new OO.ui.FieldLayout( this.lat, {
                                        label: mw.msg( 'datamap-ve-lat' ),
                                        align: 'left'
                                    } ),
                                    new OO.ui.FieldLayout( this.lon, {
                                        label: mw.msg( 'datamap-ve-lon' ),
                                        align: 'left'
                                    } )
                                ]
                            } ),
                            new OO.ui.FieldLayout( this.submitButton )
                        ]
                    } )
                ]
            } )
        ]
    } );

    this.groupMenu.$element.appendTo( this.inputBox.$element );

    this.initialiseGroupOptions();

    this.$body.append( this.panel.$element );
};


AddMarkerDialog.prototype.initialiseGroupOptions = function () {
    const widgets = [];
    for ( const [ groupId, group ] of Object.entries( this.ve.map.config.groups ) ) {
        widgets.push( new MenuOptionWidget( {
            data: groupId,
            // Display
            label: new OO.ui.HtmlSnippet( group.name ),
        } ) );
    }
    this.groupMenu.addItems( widgets );
};


// Set up the initial mode of the window ('edit', in this example.)
AddMarkerDialog.prototype.getSetupProcess = function ( data ) {
    return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
        .next( () => this.actions.setMode( 'intro' ), this );
};


// Use the getActionProcess() method to set the modes and displayed item.
AddMarkerDialog.prototype.getActionProcess = function ( action ) {
    if ( action === 'continue' ) {
        return new OO.ui.Process( () => this.close() );
    }
    return OO.ui.ProcessDialog.prototype.getActionProcess.call( this, action );
};


module.exports = AddMarkerDialog;
