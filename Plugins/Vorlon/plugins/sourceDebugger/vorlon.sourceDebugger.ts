﻿module VORLON {
    declare var $: any;
    declare var io;

    export class SRCDebugger extends Plugin {
        // Client
        private _timeoutId;
        private item;

        constructor() {
            super("SrcDebugger", "control.html", "control.css");
            this._ready = false;
            console.log("SrcDebugger loaded!");
        }

        public getID(): string {
            return "SrcDebugger";
        }

        private _markForRefresh() {
            if (this._timeoutId) {
                clearTimeout(this._timeoutId);
            }

            this._timeoutId = setTimeout(() => {
                this.refresh();
            }, 10000);
        }

        public refresh(): void {
        }

        private _getTab(json: any): any {
            var find = null;
            json.forEach((item) => {
                if (item.type == "other" && item.title.toLowerCase().indexOf("demo") > 0) {
                    find = item;
                }
            });
            return find;
        }

        private _packageJson(): any {
            var packageJson = {
                type: 'json',
                json: JSON.stringify(this.item)
            }

            return packageJson;
        }

        public onRealtimeMessageReceivedFromDashboardSide(receivedObject: any): void {
            var json;
            var xhr = new XMLHttpRequest();
            var xd;
            if (receivedObject && receivedObject.type) {
                switch (receivedObject.type) {
                    case "getJSON":
                        xhr.open("GET", "http://localhost:9222/json", true);
                        xhr.withCredentials = true;
                        xhr.onreadystatechange = () => {
                            if (xhr.readyState == 4 && xhr.status == 200) {
                                json = JSON.parse(xhr.responseText);
                                this.item = this._getTab(json);

                                Core.Messenger.sendRealtimeMessage(this.getID(), this._packageJson(), RuntimeSide.Client);
                            }
                        }
                        xhr.send();
                        break;
                }
                return;
            }
        }

        // DASHBOARD
        private _socket: any;
        private _index: number;
        private _protocolUrl: string = "/vorlon/plugins/sourceDebugger/protocol.json";
        private _protocol;
        public startDashboardSide(div: HTMLDivElement = null): void {
            Core.Messenger.sendRealtimeMessage(this.getID(), {
                type: "getJSON",
                order: null
            }, RuntimeSide.Dashboard);
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        this._protocol = JSON.parse(xhr.responseText);
                    }
                }
            }
            xhr.open("GET", this._protocolUrl);
            xhr.send();
            this._index = 0;
            this._ready = true;
        }

        //private addProtocol() {
        //    var domains = this._protocol.domains;
        //    for (var i = 0; i < domains.length; i++) {
        //        var domain = domains[i];
        //        var domainObject = this[domain.domain] = <any>{};
        //        //domainObject.on = ((domain: any) => {
        //        //    return () => {
        //        //        var events = {};
        //        //        var eventName = `${domain.domain}.${arguments[0]}`;
        //        //        console.log(eventName);

        //        //        //this.on.call(this, `${domain.domain}.${arguments[0]}`, arguments[1]);
        //        //    };
        //        //})(domain);
        //        if (domain.domain == "Debugger" && domain.commands && domain.commands.length > 0) {
        //            var commands = domain.commands;
        //            for (var j = 0; j < commands.length; j++) {
        //                this._createCommand(domain, commands[j]);
        //            }
        //        }
        //    }
        //}

        //private _createCommand(domain: any, command: any) {
        //    console.log(domain.domain + "." + command.name);
        //}

        private _connectWithClient(receivedObject: any): void {
            var json = JSON.parse(receivedObject.json);
            var url = json.webSocketDebuggerUrl;
            this._socket = new WebSocket(url);
            //this.addProtocol();
            this._socket.onopen = () => {
                if (this._socket.readyState === WebSocket.OPEN) {

                    var json = {
                        "method": "Debugger.enable",
                        "id": this._index++
                    };
                    this._socket.send(JSON.stringify(json));
                }
            };
            this._socket.onerror = () => {
            };
            this._socket.onmessage = (message) => {
                var command = {};
                if (message && message.data) {
                    var data = JSON.parse(message.data);
                    if (data.method && data.method === "Debugger.scriptParsed") {
                        command = {
                            "id": this._index++,
                            "method": "Debugger.getScriptSource",
                            "params": { "scriptId": data.params.scriptId.toString() }
                        };
                        this._socket.send(JSON.stringify(command));
                    }
                    if (data && data.result) {
                        var result = JSON.parse(data.result);
                        if (result.scriptSource) {
                            console.log(result);
                        }
                    }
                }
            };
        }

        public onRealtimeMessageReceivedFromClientSide(receivedObject: any): void {
            if (receivedObject && receivedObject.type === "json") {
                this._connectWithClient(receivedObject);
            }
        }
    }

    Core.RegisterPlugin(new SRCDebugger());
}