declare namespace mw.widgets {
    interface MediaSearchWidget extends MediaSearchWidget.Props, OO.ui.SearchWidget.Prototype {}

    namespace MediaSearchWidget {
        interface ConfigOptions extends OO.ui.SearchWidget.ConfigOptions<OO.ui.TextInputWidget> {}

        type Static = OO.ui.SearchWidget.Static;

        type Props = OO.ui.SearchWidget.Props;

        interface Prototype extends OO.ui.SearchWidget.Prototype {
            getQuery(): OO.ui.TextInputWidget;
        }

        interface Constructor {
            /** @param config Configuration options */
            new (config?: ConfigOptions): MediaSearchWidget;
            prototype: Prototype;
            static: Static;
            super: OO.ui.SearchWidget.Constructor;
        }
    }

    const MediaSearchWidget: MediaSearchWidget.Constructor;
}
