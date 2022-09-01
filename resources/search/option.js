function MenuOptionWidget( config ) {
	MenuOptionWidget.super.call( this, config );

    if ( config.icon ) {
        this.$arkIcon = $( '<img width=16 height=16 />' )
            .attr( {
                src: config.icon.options.iconUrl
            } )
            .prependTo( this.$label );
    }
};


OO.inheritClass( MenuOptionWidget, OO.ui.MenuOptionWidget );


module.exports = MenuOptionWidget;
