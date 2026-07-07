export namespace chineseconv {
	
	export class CustomPair {
	    from: string;
	    to: string;
	
	    static createFrom(source: any = {}) {
	        return new CustomPair(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.from = source["from"];
	        this.to = source["to"];
	    }
	}

}

export namespace models {
	
	export class FileDetail {
	    name: string;
	    path: string;
	    size: number;
	    modTime: string;
	    createTime: string;
	    isDir: boolean;
	    ext: string;
	    isHidden: boolean;
	    isProtected: boolean;
	    fileCount?: number;
	    folderCount?: number;
	    imageWidth?: number;
	    imageHeight?: number;
	    mediaDurationMs?: number;
	    videoWidth?: number;
	    videoHeight?: number;
	    lineCount?: number;
	
	    static createFrom(source: any = {}) {
	        return new FileDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.size = source["size"];
	        this.modTime = source["modTime"];
	        this.createTime = source["createTime"];
	        this.isDir = source["isDir"];
	        this.ext = source["ext"];
	        this.isHidden = source["isHidden"];
	        this.isProtected = source["isProtected"];
	        this.fileCount = source["fileCount"];
	        this.folderCount = source["folderCount"];
	        this.imageWidth = source["imageWidth"];
	        this.imageHeight = source["imageHeight"];
	        this.mediaDurationMs = source["mediaDurationMs"];
	        this.videoWidth = source["videoWidth"];
	        this.videoHeight = source["videoHeight"];
	        this.lineCount = source["lineCount"];
	    }
	}
	export class FileInfo {
	    name: string;
	    path: string;
	    isDir: boolean;
	    size: number;
	    // Go type: time
	    modTime: any;
	    ext: string;
	    isProtected: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDir = source["isDir"];
	        this.size = source["size"];
	        this.modTime = this.convertValues(source["modTime"], null);
	        this.ext = source["ext"];
	        this.isProtected = source["isProtected"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PathInspection {
	    path: string;
	    exists: boolean;
	    accessible: boolean;
	    isDir: boolean;
	
	    static createFrom(source: any = {}) {
	        return new PathInspection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.exists = source["exists"];
	        this.accessible = source["accessible"];
	        this.isDir = source["isDir"];
	    }
	}
	export class PrivacyState {
	    mode: string;
	    hasPassword: boolean;
	    restorePrivacyOnStartup: boolean;
	    shouldPromptRestore: boolean;
	    windowsIdentityAvailable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new PrivacyState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mode = source["mode"];
	        this.hasPassword = source["hasPassword"];
	        this.restorePrivacyOnStartup = source["restorePrivacyOnStartup"];
	        this.shouldPromptRestore = source["shouldPromptRestore"];
	        this.windowsIdentityAvailable = source["windowsIdentityAvailable"];
	    }
	}
	export class Tag {
	    id: string;
	    name: string;
	    type: string;
	    colorHex: string;
	    sortOrder: number;
	    isProtected: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Tag(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.colorHex = source["colorHex"];
	        this.sortOrder = source["sortOrder"];
	        this.isProtected = source["isProtected"];
	    }
	}

}

export namespace rename {
	
	export class Scheme {
	    name: string;
	    code: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new Scheme(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.code = source["code"];
	        this.path = source["path"];
	    }
	}

}

