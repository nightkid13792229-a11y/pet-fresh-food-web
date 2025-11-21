//
//  ViewController.m
//  SDKDemoOC
//
//  Created by yu on 2024/6/6.
//

#import "ViewController.h"
#import "JCAPI.h"

@interface ViewController ()
@property (weak, nonatomic) IBOutlet UITextField *textF;
@property (assign, nonatomic) int total;

@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.
}



-(IBAction)connectAction:(id)sender{
    //输入框里是打印机蓝牙名称，则使用蓝牙连接方式，否则使用Wi-Fi连接
    [JCAPI openPrinter:self.textF.text completion:^(BOOL isSuccess) {
        if (isSuccess) {
            NSLog(@"连接成功");
        }else{
            NSLog(@"连接失败/断开连接");
        }
    }];
//    [JCAPI openPrinterHost:self.textF.text completion:^(BOOL isSuccess) {
//        if (isSuccess) {
//            NSLog(@"连接成功");
//        }else{
//            NSLog(@"连接失败/断开连接");
//        }
//    }];
}

- (IBAction)makeWifi:(id)sender {
    //名称/密码不支持中文
    [JCAPI configurationWifi:@"wifi名称" password:@"Wi-Fi密码" completion:^(NSDictionary * _Nullable printDicInfo) {
        if([@"0" isEqualToString:printDicInfo[@"statusCode"]]){
            NSLog(@"配网成功");
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.f * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                [JCAPI getWifiConfiguration:^(NSDictionary * _Nullable printDicInfo1) {
                    if([@"0" isEqualToString:printDicInfo1[@"statusCode"]]){
                        NSLog(@"获取成功");
                        NSLog(@"配网信息:%@",[printDicInfo1 valueForKey:@"result"]);
                    }
                }];
            });
        }
        else if ([@"-1" isEqualToString:printDicInfo[@"statusCode"]])
        {
            NSLog(@"配网失败");
        }
        else if ([@"-2" isEqualToString:printDicInfo[@"statusCode"]])
        {
            NSLog(@"打印机忙碌");
        }
        else if ([@"-3" isEqualToString:printDicInfo[@"statusCode"]])
        {
            NSLog(@"不支持配网");
        }
    }];
}

#pragma mark =======button actions

-(void)startPrint:(PRINT_STATE)callback{
    __weak typeof(self) weakSelf = self;
    [JCAPI getPrintingCountInfo:^(NSDictionary * _Nullable dic) {
        NSString *printInfo = dic[@"totalCount"];
        NSString *pageNo = dic[@"pageNO"];
        NSString *pageCount = dic[@"pageCount"];
        NSString *tid = dic[@"tid"];//可能为空
        NSString *carbonUsed = dic[@"carbonUsed"];
        NSLog(@"total:%@ \n pageNo:%@ \n  pageCount:%@ \n  tid:%@  \n  carbonUsed:%@",printInfo,pageNo,pageCount,tid,carbonUsed);
        if (weakSelf.total == printInfo.intValue && weakSelf.total > 0) {
            NSLog(@"打印完成，必须调用endprint");
            [JCAPI endPrint:^(BOOL isSuccess) {
                NSLog(@"整个流程结束.....");
            }];
        }
    }];
    
    [JCAPI getPrintingErrorInfo:^(NSString * _Nullable printInfo) {
        NSLog(@"异常");
        if ([@"19" isEqualToString:printInfo]) {
            NSLog(@"error code 19 ignore");
        }else{
            NSLog(@"error : %@",printInfo);
        }
    }];
    
    [JCAPI startJob:3 withPaperStyle:1 withCompletion:callback];
}

-(IBAction)printText:(id)sender{
    NSLog(@"开始打印");
    self.total = 1;
    [JCAPI setTotalQuantityOfPrints:self.total];
    __weak typeof(self) weakSelf = self;
    [self startPrint:^(BOOL isSuccess) {
        [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
        [weakSelf drawText];
        NSString *json = [JCAPI GenerateLableJson];
        [JCAPI commit:json withOnePageNumbers:weakSelf.total withComplete:^(BOOL isSuccess) {
             //这里发送下一份
        }];
    }];
}


-(IBAction)printBarCode:(id)sender{
    self.total = 1;
    [JCAPI setTotalQuantityOfPrints:self.total];
    __weak typeof(self) weakSelf = self;
    [self startPrint:^(BOOL isSuccess) {
        [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
        [weakSelf drawBarcode];
        NSString *json = [JCAPI GenerateLableJson];
        [JCAPI commit:json withOnePageNumbers:weakSelf.total withComplete:^(BOOL isSuccess) {
            //这里发送下一份
        }];
    }];
}

-(IBAction)printQrCode:(id)sender{
    self.total = 1;
    [JCAPI setTotalQuantityOfPrints:self.total];
    __weak typeof(self) weakSelf = self;
    [self startPrint:^(BOOL isSuccess) {
        [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
        [weakSelf drawQrcode];
        NSString *json = [JCAPI GenerateLableJson];
        [JCAPI commit:json withOnePageNumbers:weakSelf.total withComplete:^(BOOL isSuccess) {
            //这里发送下一份
        }];
    }];
}

-(IBAction)printImage:(id)sender{
    self.total = 1;
    [JCAPI setTotalQuantityOfPrints:self.total];
    __weak typeof(self) weakSelf = self;
    [self startPrint:^(BOOL isSuccess) {
        [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
        [weakSelf drawImage];
        NSString *json = [JCAPI GenerateLableJson];
        [JCAPI commit:json withOnePageNumbers:weakSelf.total withComplete:^(BOOL isSuccess) {
            //这里发送下一份
        }];
    }];
}

-(IBAction)printRect:(id)sender{
    self.total = 1;
    [JCAPI setTotalQuantityOfPrints:self.total];
    __weak typeof(self) weakSelf = self;
    [self startPrint:^(BOOL isSuccess) {
        [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
        [weakSelf drawRect];
        NSString *json = [JCAPI GenerateLableJson];
        [JCAPI commit:json withOnePageNumbers:weakSelf.total withComplete:^(BOOL isSuccess) {
            //这里发送下一份
        }];
    }];
}

-(IBAction)printAll:(id)sender{
    int c1 = 1;
    int c2 = 2;
    int c3 = 3;
    int c4 = 4;
    int c5 = 5;
    int c6 = 6;
    __weak typeof(self) weakSelf = self;
    self.total = c1+c2+c3+c4+c5+c6;
    [JCAPI setTotalQuantityOfPrints:self.total];
    [self startPrint:^(BOOL isSuccess) {
        [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
        [weakSelf drawRect];
        NSString *json = [JCAPI GenerateLableJson];
        [JCAPI commit:json withOnePageNumbers:c1 withComplete:^(BOOL isSuccess) {
            //这里发送下一份
            [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
            [weakSelf drawText];
            NSString *json = [JCAPI GenerateLableJson];
            [JCAPI commit:json withOnePageNumbers:c2 withComplete:^(BOOL isSuccess) {
                //这里发送下一份
                [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
                [weakSelf drawQrcode];
                NSString *json = [JCAPI GenerateLableJson];
                [JCAPI commit:json withOnePageNumbers:c3 withComplete:^(BOOL isSuccess) {
                    //这里发送下一份
                    [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
                    [weakSelf drawBarcode];
                    NSString *json = [JCAPI GenerateLableJson];
                    [JCAPI commit:json withOnePageNumbers:c4 withComplete:^(BOOL isSuccess) {
                        //这里发送下一份
                        [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
                        [weakSelf drawImage];
                        NSString *json = [JCAPI GenerateLableJson];
                        [JCAPI commit:json withOnePageNumbers:c5 withComplete:^(BOOL isSuccess) {
                            //这里发送下一份
                            [JCAPI initDrawingBoard:50 withHeight:30 withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
                            [weakSelf drawQrcode];
                            NSString *json = [JCAPI GenerateLableJson];
                            [JCAPI commit:json withOnePageNumbers:c6 withComplete:^(BOOL isSuccess) {
                                //这里发送下一份
                            }];
                        }];
                    }];
                }];
            }];
        }];
    }];
}
-(IBAction)closeAction:(id)sender{
    //断开连接，回调在连接的回调里返回
    [JCAPI closePrinter];
}

-(IBAction)printBefore:(id)sender{
    [self loadFonts];
    NSString *fontPath = [NSString stringWithFormat:@"%@/font",[NSHomeDirectory() stringByAppendingString:@"/Documents"]];// 字体存储的路径
    NSLog(@"打印设置：设置默认字体路径---%@",fontPath);
    //设置路径根据自己拷贝的字体路径情况修改
    [JCAPI initImageProcessing:fontPath error:nil];
}


-(void)copyFileFromPath:(NSString *)sourcePath toPath:(NSString *)toPath
{
    NSFileManager *fileManager = [[NSFileManager alloc] init];
    NSArray* array = [fileManager contentsOfDirectoryAtPath:sourcePath error:nil];
    for(int i = 0; i<[array count]; i++)
    {
        NSString *fullPath = [sourcePath stringByAppendingPathComponent:[array objectAtIndex:i]];
        NSString *fullToPath = [toPath stringByAppendingPathComponent:[array objectAtIndex:i]];
        NSLog(@"%@",fullPath);
        NSLog(@"%@",fullToPath);
        //判断是不是文件夹
        BOOL isFolder = NO;
        //判断是不是存在路径 并且是不是文件夹
        BOOL isExist = [fileManager fileExistsAtPath:fullPath isDirectory:&isFolder];
        if (isExist)
        {
            NSError *err = nil;
            [[NSFileManager defaultManager] copyItemAtPath:fullPath toPath:fullToPath error:&err];
            NSLog(@"%@",err);
            if (isFolder)
            {
                [self copyFileFromPath:fullPath toPath:fullToPath];
            }
        }
    }

}

-(void)loadFonts{
    NSString *path = [[NSBundle mainBundle] pathForResource:@"FONT.json" ofType:nil];
    NSString *str = [[NSString alloc] initWithContentsOfFile:path encoding:NSUTF8StringEncoding error:nil];
    if(str){
        NSData *jsonData = [str dataUsingEncoding:NSUTF8StringEncoding];
        if(jsonData){
            NSError *err;
            NSDictionary *dic = [NSJSONSerialization JSONObjectWithData:jsonData
                                                                options:NSJSONReadingMutableContainers
                                                                  error:&err];
            if(dic){
                NSArray *arr = [dic valueForKey:@"fonts"];
                if(arr){
                    NSString *fontPath = [NSString stringWithFormat:@"%@/font",[NSHomeDirectory() stringByAppendingString:@"/Documents"]];
                    NSFileManager *manager = [NSFileManager defaultManager];
                    if(![manager contentsOfDirectoryAtPath:fontPath error:nil]){
                        [manager createDirectoryAtPath:fontPath withIntermediateDirectories:NO attributes:nil error:nil];
                    }
                    for (NSDictionary *obj in arr) {
                        NSString *name = [obj valueForKey:@"url"];
                        NSString *newPath = [NSString stringWithFormat:@"%@/%@",fontPath,name];
                        if(![manager fileExistsAtPath:newPath]){
                            NSString *oldPath = [[NSBundle mainBundle] pathForResource:name ofType:nil];
                            if (!oldPath) {
                                continue;
                            }
                            NSArray *pathArr = [oldPath componentsSeparatedByString:@"/"];
                            NSMutableArray *newPathArr = [NSMutableArray arrayWithArray:pathArr];
                            [newPathArr removeLastObject];
                            oldPath = [newPathArr componentsJoinedByString:@"/"];
                            [self copyFileFromPath:oldPath toPath:fontPath];
                            break;
                        }
                    }
                }
            }
        }
    }
}



#pragma mark =====draw elements

-(void)drawText{
    [JCAPI drawLableText:10
                   withY:10
               withWidth:40
              withHeight:10
              withString:@"武汉精臣科技有限公司"
          withFontFamily:@"ZT001"
            withFontSize:3
              withRotate:0
 withTextAlignHorizonral:0
   withTextAlignVertical:0
            withLineMode:0
       withLetterSpacing:0
         withLineSpacing:0
           withFontStyle:@[@0,@0,@1,@0]];
}

-(void)drawBarcode{
    [JCAPI drawLableBarCode:4
                      withY:15
                  withWidth:25
                 withHeight:12
                 withString:@"12345678"
               withFontSize:3
                 withRotate:0
               withCodeType:20
             withTextHeight:5
           withTextPosition:0];
}

-(void)drawRect{
    [JCAPI DrawLableGraph:2
                    withY:2
                withWidth:46
               withHeight:26
            withLineWidth:1
         withCornerRadius:1
               withRotate:0
            withGraphType:3
             withLineType:1
            withDashWidth:nil];
}

-(void)drawQrcode{
    [JCAPI drawLableQrCode:5
                     withY:5
                 withWidth:20
                withHeight:20
                withString:@"123456www.tian.com"
                withRotate:0
              withCodeType:31];
}

-(void)drawImage{
    [JCAPI DrawLableImage:2
                    withY:2
                withWidth:25
               withHeight:25
            withImageData:@"iVBORw0KGgoAAAANSUhEUgAAAJYAAAATCAYAAAByfPSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAdFSURBVGhDzZpddtQ2FMclyw70qbCChhUAK0gyLz3NPDSsoO0KgBXQrACyApIVJHlIevqSjxUwXQHZQcNTgbGs3r985ZFl+WOcYcLvnHvGsjS2LN0vyZZfdie/C48H5xeHfFhjPt3aLoza5KKlre1YvuxuPRNCkTj07MH59YwLncx/mewVUjziotjI9Ik8vb7F8X8/b20mSm3bigiJ1Dd5Lm5++Pv6hk8NAv1NaEwSabaMlHR9cyOMnBmpr7Oz6ytuZjG/bj36Old7XFwK9C+8Hvg6nbxSxvxkj3Vx0NX/fHfyRgpjxyfWFnqQCvOUi3dG5tOJ4WPGnKRnly+4UDGf7ryXQtaUMD27kHwomtcp6WtTq6eHF1L8yUVhjLjNtX7eN+FQKpmIYy5ajNA7bjJi9S3MtBEHfQYDJdF58p6Gr1VR0PdCiNf+tWJjOAhjrtLzy53FffF8xYEUyUvXB1OIF1KKp0KaZ1BuLfSpkskb1AFj5DbVl4ZH16NxtkZXCHm9cXbxbnTfWkj410PuYSK4cK9gIDJVDmQbGGwapM42S/BM0bW6nh+Wnc/Vxy6lAui7vRZNGJ8S2dnlH/QzyAO3g/vKPVPz7A5DXpPqSbngSV1bSKVUwHrX8rzzeD5k/eR5SfkCgbFwk9Y2Vsg5RRSLoAFB+ODS/UKDAJfPpQaw4NqgDWeGQfAHq6JFUaFwUJZl7gcvkO/uXHJRzHPdiAZDcaG9FSltv2jSb7O/Lk600c+d1JSCvJs7n4viiE9XSCMO4SFDoVC6MIpCvI61sUIRL6pYQzzFOqFOvi3zrzqlwsHylodCpR2Y7PzicWllC/D8oWF1eUaetHZPRMbhvCDCOinXE4RqCHWkCv0VUHiutyKLfa5x9xKJET/aEx6kUFaxqK5sI9WxE5Qr6DkWdcONhPLIakzyQnd63rjHAj2eYt2Eg4OJJ8uqcoi7QPnHAR9WpEk91MQ8IyYZeVSa6SeUKz5HvmiVJaZkXhSAciH/gyDRt/U+lP+4eidcU+ES8Rpm0T8YAiWvm5V4fcexOy8KFVEsY+felzL5p/aMStVe2AbiDKhdsYg2T3Ef4KHQcS6KLE3ehhM9FpMsBgxAYXyLtN4q8IylUukdJL5+iIISQMmoxQmfsqCvmAwujgL9gBInD8ymfCje8WkLVsTqIeVWVJdkxT76pFL92InzdAAh0J1PN3RDaeFUMPe+0ATUPGtY74QWSdbY6bibRKgqP7hv0HEoeqlg40KgA8kvroVkPPR8iTCH/ko0z0XDuEjR33Vthai0QKJeg667xYej+DoXmzpX/xZf5A3EHwPkfu68nifH2B5CWye+ESqpPrjzeZ685dMVNjEvve4g4fY1ehULHcqnO0OW6msBIXEVIRBKigEOk3FDSgWL56IltgKba91Ien2sFwtyNyz5+XAUha5yOSc+i4mW5URjwvtEGihoHZu8l6F9kCCR579WNBQLN+NDD7s0vdOgrAqbG3iKsGqwitNz9ZKLFspnGhuHfXtrwE2wA/0uw+o4cE/K4V5DytXlItzSSm/f1eV5sV/mZZq8Zrf0GchYIh6r3IfgQoWfuK0TaUwtlwhB7gAvw8XB4D/22oFXsVA+4b+RiFn1kO0YGrOaElkP0bdl0It6Lyk92VDYHA0w5M2pLlPqNxRx3CdputhEXSXRUIj8IO651k8hi9OYojuQ6xgh/+HiEhRH6vzSbjnY5DZ4XoRKPoTyNq7fl4jDM4Whr7YPNBZv5ddGbMUIQ3JCxc5+kKe1e29DxSXsPlHFKq0KrvL7oFXRyduk5xe1fGgMeN7ENFdxLmzFVk7I87q8Vmx7gv7zbY3VvaaJpAowvoV0K7iNTtidHyqiubiJKhZAjO4LQ+sipugIgVoUjaRxlXz+XE5QLBGH0qRKfQhf4mOlWS52mtsTsV3uZXHKSgqyVEiFB3bS+04Qz4qN20Dqxk2GGGlTCGGfsVWxAEIF/dzdfa+AMhn1klUp9od++dCH/XIjGGwMop+gz3Vz+wCTjFUlXq4jJMynk49YaYZKBRCyV9VfQF7pEx9W0D2ssoW5HcBGrpPQSJpIGwlC4UqLKeRRWA/Bvh7qOxULUP6BneTvgkVINCfuAcYiTfLG5gjTyQeb9AbhIwyNVslglW1QSLAhJM5MZbqxu78sd1lRYmXrhE8tjf9841/pMAgDeGnJxXvFhcTY5uPSePlBqFTELNzLArDITuWKQd4Bxln2/W640Az8nfQKY1rvgfDnhJ+7FTLeV/C+oXC1JU2V9dBt0qtYAG/K6XatK7N1YnO/FUxSDEwWQkWXIkC57NcCscWER3WtrHjxrfrbSmTlCOdQSc/2DAwN3ikUrrbE6msSJp9tXyvCDYdfQH77L0jrX4K2gdVZ+IXosl+QFqQIG9ly+0x44UqTQKHFbOPNPw0o9tRmWHllqT4ccq3YuA6Zg0LrqzQVm+6rXr+MrxvgDPy59efKHw93r9gXwmNJjLj9HwA7yDjeExZDAAAAAElFTkSuQmCC"
               withRotate:0
  withImageProcessingType:1
 withImageProcessingValue:127];
}

@end
