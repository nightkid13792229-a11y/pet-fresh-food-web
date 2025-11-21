//
//  ViewController.swift
//  SDKDemoSwift
//
//  Created by yu on 2024/6/6.
//

import UIKit

class ViewController: UIViewController {

    @IBOutlet weak var textF: UITextField!
    
    var total = 1;
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
    }

    
    
    @IBAction func connectAction(_ sender: Any) {
        JCAPI.openPrinter(self.textF.text ?? "") { flag in
            if flag == true{
                print("连接成功")
            }else{
                print("连接失败/断开连接")
            }
        }
    }
    
    @IBAction func makeWifi(_ sender: Any) {
        //名称/密码不支持中文
        JCAPI.configurationWifi("wifi名称", password: "Wi-Fi密码") { dic1 in
            if let dic = dic1 as? NSDictionary{
                let code = dic.value(forKey: "statusCode") as! String
                if code == "0"{
                    print("配网成功")
                    DispatchQueue.main.asyncAfter(deadline: DispatchTime.now()+2.0, execute: DispatchWorkItem(block: {
                        JCAPI.getWifiConfiguration { dic2 in
                            if let dic3 = dic2 as? NSDictionary{
                                let code1 = dic3.value(forKey: "statusCode") as! String
                                if code1 == "0"
                                {
                                    print("获取成功")
                                    print("配网信息:"+(dic3.value(forKey: "result") as! String))
                                }
                            }
                        }
                    }))
                }
                else if code == "-1"{
                    print("配网失败")
                }
                else if code == "-2"{
                    print("打印机忙碌")
                }
                else if code == "-3"{
                    print("不支持配网")
                }
                else{
                    print(code)
                }
            }
        }
    }
    
    @IBAction func closeAction(_ sender: Any) {
        JCAPI.closePrinter()
    }
    
    @IBAction func printBeforeAction(_ sender: Any) {
        Help.loadFonts()
        let fontPath = String(format: "%@/Documents/font", NSHomeDirectory())
        //设置路径根据自己拷贝的字体路径情况修改
        JCAPI.initImageProcessing(fontPath, error: nil)
    }
    
    @IBAction func printText(_ sender: Any) {
        self.total = 1
        JCAPI.setTotalQuantityOfPrints(self.total)
        weak var weakSelf = self
        self.startPrint { flag in
            JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
            weakSelf?.drawText()
            let json:String = JCAPI.generateLableJson() ?? ""
            JCAPI.commit(json, withOnePageNumbers: Int32(weakSelf?.total ?? 1)) { isSuccess in
                //这里发送下一份
            }
        }
    }
    
    @IBAction func printBarcode(_ sender: Any) {
        self.total = 1
        JCAPI.setTotalQuantityOfPrints(self.total)
        weak var weakSelf = self
        self.startPrint { flag in
            JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
            weakSelf?.drawBarcode()
            let json:String = JCAPI.generateLableJson() ?? ""
            JCAPI.commit(json, withOnePageNumbers: Int32(weakSelf?.total ?? 1)) { isSuccess in
                //这里发送下一份
            }
        }
    }
    
    @IBAction func printQrcode(_ sender: Any) {
        self.total = 1
        JCAPI.setTotalQuantityOfPrints(self.total)
        weak var weakSelf = self
        self.startPrint { flag in
            JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
            weakSelf?.drawQrcode()
            let json:String = JCAPI.generateLableJson() ?? ""
            JCAPI.commit(json, withOnePageNumbers: Int32(weakSelf?.total ?? 1)) { isSuccess in
                //这里发送下一份
            }
        }
    }
    
    @IBAction func printRect(_ sender: Any) {
        self.total = 1
        JCAPI.setTotalQuantityOfPrints(self.total)
        weak var weakSelf = self
        self.startPrint { flag in
            JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
            weakSelf?.drawRect()
            let json:String = JCAPI.generateLableJson() ?? ""
            JCAPI.commit(json, withOnePageNumbers: Int32(weakSelf?.total ?? 1)) { isSuccess in
                //这里发送下一份
            }
        }
    }
    
    @IBAction func printImage(_ sender: Any) {
        self.total = 1
        JCAPI.setTotalQuantityOfPrints(self.total)
        weak var weakSelf = self
        self.startPrint { flag in
            JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
            weakSelf?.drawImage()
            let json:String = JCAPI.generateLableJson() ?? ""
            JCAPI.commit(json, withOnePageNumbers: Int32(weakSelf?.total ?? 1)) { isSuccess in
                //这里发送下一份
            }
        }
    }
    
    @IBAction func printAll(_ sender: Any) {
        let c1 = 1
        let c2 = 2
        let c3 = 2
        let c4 = 1
        let c5 = 3
        let c6 = 2
        self.total = c1+c2+c3+c4+c5+c6
        JCAPI.setTotalQuantityOfPrints(self.total)
        weak var weakSelf = self
        self.startPrint { flag in
            JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
            weakSelf?.drawImage()
            let json:String = JCAPI.generateLableJson() ?? ""
            JCAPI.commit(json, withOnePageNumbers: Int32(c1)) { isSuccess in
                //这里发送下一份
                JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
                weakSelf?.drawRect()
                let json:String = JCAPI.generateLableJson() ?? ""
                JCAPI.commit(json, withOnePageNumbers: Int32(c2)) { isSuccess in
                    //这里发送下一份
                    JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
                    weakSelf?.drawText()
                    let json:String = JCAPI.generateLableJson() ?? ""
                    JCAPI.commit(json, withOnePageNumbers: Int32(c3)) { isSuccess in
                        //这里发送下一份
                        JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
                        weakSelf?.drawBarcode()
                        let json:String = JCAPI.generateLableJson() ?? ""
                        JCAPI.commit(json, withOnePageNumbers: Int32(c4)) { isSuccess in
                            //这里发送下一份
                            JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
                            weakSelf?.drawQrcode()
                            let json:String = JCAPI.generateLableJson() ?? ""
                            JCAPI.commit(json, withOnePageNumbers: Int32(c5)) { isSuccess in
                                //这里发送下一份
                                JCAPI.initDrawingBoard(50, withHeight: 30, withHorizontalShift: 0, withVerticalShift: 0, rotate: 0, fontArray: [])
                                weakSelf?.drawImage()
                                let json:String = JCAPI.generateLableJson() ?? ""
                                JCAPI.commit(json, withOnePageNumbers: Int32(c6)) { isSuccess in
                                    //这里发送下一份
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    
    func startPrint(action:(@escaping(Bool)->Void)) {
        weak var weakSelf = self
        JCAPI.getPrintingCountInfo{dic1 in
            if let dic = dic1 as? NSDictionary{
                let count:String = dic.value(forKey: "totalCount") as! String
                let pageNo:String = dic.value(forKey: "pageNO") as! String
                let pageCount:String = dic.value(forKey: "pageCount") as! String
                print("total:"+String(count)+"\npageNo:"+String(pageNo)+"\npageCount"+String(pageCount))
                if weakSelf?.total == Int(count){
                    JCAPI.endPrint { flag in
                        print("整个流程结束.....");
                    }
                }
            }
        }
        JCAPI.getPrintingErrorInfo{printInfo in
            if printInfo == "19"
            {
                print("error code 19 ignore")
            }else{
                print("error :"+((printInfo ?? "") as String))
            }
        }
        JCAPI.startJob(3, withPaperStyle: 1) { flag in
            action(flag)
        }
    }
    
    

   func drawText(){
       JCAPI.drawLableText(10, withY: 10, withWidth: 40, withHeight: 10, with: "武汉精臣科技有限公司", withFontFamily: "ZT001", withFontSize: 3, withRotate: 0, withTextAlignHorizonral: 0, withTextAlignVertical: 0, withLineMode: 0, withLetterSpacing: 0, withLineSpacing: 0, withFontStyle: [0,0,1,0])
    }

    func drawBarcode(){
        JCAPI.drawLableBarCode(4, withY: 15, withWidth: 25, withHeight: 12, with: "12345678", withFontSize: 3, withRotate: 0, withCodeType: 20, withTextHeight: 5, withTextPosition: 0)
    }

    func drawRect(){
        JCAPI.drawLableGraph(2, withY: 2, withWidth: 46, withHeight: 26, withLineWidth: 1, withCornerRadius: 1, withRotate: 0, withGraphType: 3, withLineType: 1, withDashWidth: nil)
    }

    func drawQrcode(){
        JCAPI.drawLableQrCode(5, withY: 5, withWidth: 20, withHeight: 20, with: "123456www.tian.com", withRotate: 0, withCodeType: 31)
    }

    func drawImage(){
        JCAPI.drawLableImage(2, withY: 2, withWidth: 25, withHeight: 25, withImageData: "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", withRotate: 0, withImageProcessingType: 1, withImageProcessingValue: 127)
    }
    
}

