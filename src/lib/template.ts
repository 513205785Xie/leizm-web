/**
 * @leizm/web 中间件基础框架
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as path from "path";
import * as assert from "assert";
import { TemplateRenderData, TemplateRenderFileFunction } from "./define";

export class TemplateEngineManager {
  protected engines: Map<string, TemplateRenderFileFunction> = new Map();
  protected defaultEngine: string = "";
  protected root: string = "./views";

  /**
   * 设置模板根目录
   * @param dir
   */
  public setRoot(dir: string): this {
    this.root = dir;
    return this;
  }

  /**
   * 注册模板引擎
   * @param ext 模板扩展名
   * @param renderFile 模板渲染函数
   */
  public register(ext: string, renderFile: TemplateRenderFileFunction): this {
    if (ext[0] !== ".") ext = "." + ext;
    this.engines.set(ext, renderFile);
    return this;
  }

  /**
   * 设置默认渲染引擎
   * @param ext 模板扩展名
   */
  public setDefault(ext: string): this {
    if (ext[0] !== ".") ext = "." + ext;
    assert(this.engines.has(ext), `模板引擎 ${ext} 未注册`);
    this.defaultEngine = ext;
    return this;
  }

  /**
   * 渲染模板
   * @param name 模板名
   * @param data 数据
   */
  public render(name: string, data: TemplateRenderData = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      let ext = path.extname(name);
      let fileName = path.resolve(this.root, name);
      let renderFile: TemplateRenderFileFunction;
      if (ext && this.engines.has(ext)) {
        renderFile = this.engines.get(ext)!;
      } else {
        assert(this.engines.has(this.defaultEngine), `未设置默认模板引擎，无法渲染模板类型 ${ext}`);
        if (!ext) {
          ext = this.defaultEngine;
          fileName += ext;
        }
        renderFile = this.engines.get(this.defaultEngine)!;
      }
      renderFile(fileName, data, (err, ret) => {
        if (err) return reject(err);
        resolve(ret);
      });
    });
  }
}
