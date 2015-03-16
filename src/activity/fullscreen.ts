/// <reference path="../../lib/suppressWarnings.d.ts" />

module Activity {

    export class Fullscreen {

        private container;
        private $button;
        private onChanged : Function;

        constructor(container : HTMLElement, $button : JQuery, onChanged : Function) {
            this.container = container;
            this.$button = $button;
            this.onChanged = onChanged;

            this.$button.on("click", () => this.toggleFullscreen());
        }

        public onShow() : void {
            $(document).on("fullscreenchange", () => this.fullscreenChanged());
            $(document).on("webkitfullscreenchange", () => this.fullscreenChanged());
            $(document).on("mozfullscreenchange", () => this.fullscreenChanged());
            $(document).on("MSFullscreenChange", () => this.fullscreenChanged());

            $(document).on("fullscreenerror", () => this.fullscreenError());
            $(document).on("webkitfullscreenerror", () => this.fullscreenError());
            $(document).on("mozfullscreenerror", () => this.fullscreenError());
            $(document).on("MSFullscreenError", () => this.fullscreenError());
        }

        public onHide() : void {
            $(document).off("fullscreenchange");
            $(document).off("webkitfullscreenchange");
            $(document).off("mozfullscreenchange");
            $(document).off("MSFullscreenChange");

            $(document).off("fullscreenerror");
            $(document).off("webkitfullscreenerror");
            $(document).off("mozfullscreenerror");
            $(document).off("MSFullscreenError");
        }

        public isFullscreen(): boolean {
            return !!document.fullscreenElement ||
                   !!document.mozFullScreenElement ||
                   !!document.webkitFullscreenElement ||
                   !!document.msFullscreenElement;
        }

        public toggleFullscreen() : void {
            if (!this.isFullscreen()) {
                if (this.container.requestFullscreen) {
                    this.container.requestFullscreen();
                } else if (this.container.msRequestFullscreen) {
                    this.container.msRequestFullscreen();
                } else if (this.container.mozRequestFullScreen) {
                    this.container.mozRequestFullScreen();
                } else if (this.container.webkitRequestFullscreen) {
                    this.container.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        }

        private fullscreenChanged() : void {
            this.$button.text(this.isFullscreen() ? "Exit" : "Fullscreen");
            this.onChanged();
        }

        private fullscreenError() : void {
            this.fullscreenChanged();
        }
    }

}
