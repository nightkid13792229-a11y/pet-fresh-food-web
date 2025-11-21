//
//  Help.m
//  SDKDemoSwift
//
//  Created by yu on 2024/6/6.
//

#import "Help.h"

@implementation Help

+(void)copyFileFromPath:(NSString *)sourcePath toPath:(NSString *)toPath
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

+(void)loadFonts{
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


@end
